import prisma from '../config/prismaClient.js';
import logger from '../utils/logger.js';
import blogAIService from './blogAIService.js';
import blogImageService from './blogImageService.js';
import { v4 as uuidv4 } from 'uuid';

class BlogAutomationService {
  constructor() {
    this.isEnabled = process.env.BLOG_AUTOMATION_ENABLED === 'true';
    this.defaultAuthorId = null;
    this.industry = process.env.BLOG_INDUSTRY || 'facilities and property management';
    this.targetWordCount = parseInt(process.env.BLOG_TARGET_WORD_COUNT) || 1500;
    this.autoPublish = process.env.BLOG_AUTO_PUBLISH === 'true';
  }

  /**
   * Initialize the service by finding or creating a bot user
   */
  async initialize() {
    try {
      // Find or create a bot user for authoring automated posts
      let botUser = await prisma.user.findFirst({
        where: {
          email: 'blog-bot@agentfm.com'
        }
      });

      if (!botUser) {
        // Create a bot user
        botUser = await prisma.user.create({
          data: {
            email: 'blog-bot@agentfm.com',
            firstName: 'AgentFM',
            lastName: 'Blog Bot',
            passwordHash: uuidv4(), // Random password, bot can't login
            role: 'ADMIN',
            isActive: false, // Bot user is not active for login
            emailVerified: true
          }
        });
        logger.info('Created blog bot user', { userId: botUser.id });
      }

      this.defaultAuthorId = botUser.id;
      logger.info('Blog automation service initialized', {
        authorId: this.defaultAuthorId,
        enabled: this.isEnabled
      });
    } catch (error) {
      logger.error('Failed to initialize blog automation service', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate and publish a new blog post
   * @returns {Promise<Object>} Created blog post
   */
  async generateDailyPost() {
    if (!this.isEnabled) {
      logger.info('Blog automation is disabled');
      return null;
    }

    if (!this.defaultAuthorId) {
      await this.initialize();
    }

    try {
      logger.info('Starting daily blog post generation');

      // Step 1: Get recent posts to avoid repetition
      const recentPosts = await this.getRecentPosts(30);
      const recentTopics = recentPosts.map(post => post.title);

      // Step 2: Get available categories
      const categories = await prisma.blogCategory.findMany({
        select: { name: true }
      });
      const categoryNames = categories.map(c => c.name);

      // Step 3: Generate topic using AI
      logger.info('Generating blog topic...');
      const topic = await blogAIService.generateTopic({
        recentTopics,
        categories: categoryNames,
        industry: this.industry
      });

      // Step 4: Generate full content
      logger.info('Generating blog content...', { topic: topic.title });
      const content = await blogAIService.generateContent(topic, this.targetWordCount);

      // Step 5: Generate image
      logger.info('Generating cover image...');
      const imagePrompt = await blogAIService.generateImagePrompt(topic, content.content);
      const coverImageUrl = await blogImageService.generateImage(imagePrompt, topic);
      const imageMetadata = blogImageService.generateImageMetadata(topic, coverImageUrl);

      // Step 6: Find or create category
      const category = await this.findOrCreateCategory(topic.category);

      // Step 7: Find or create tags
      const tags = await this.findOrCreateTags([
        ...topic.keywords,
        ...(content.suggestedTags || [])
      ]);

      // Step 8: Create the blog post
      logger.info('Creating blog post in database...');
      const blogPost = await prisma.blogPost.create({
        data: {
          title: topic.title,
          slug: await this.generateUniqueSlug(topic.slug),
          excerpt: topic.excerpt,
          content: content.content,
          htmlContent: content.htmlContent,
          coverImage: imageMetadata.url,
          ogImage: imageMetadata.url,
          authorId: this.defaultAuthorId,
          status: this.autoPublish ? 'PUBLISHED' : 'DRAFT',
          publishedAt: this.autoPublish ? new Date() : null,
          featured: false,
          metaTitle: content.metaTitle || topic.title,
          metaDescription: content.metaDescription || topic.excerpt,
          metaKeywords: [...new Set([...topic.keywords, ...topic.keywords])], // Deduplicate
          isAutomated: true,
          automationMetadata: {
            generatedAt: new Date().toISOString(),
            topic,
            contentAnalysis: {
              readingTime: content.readingTime,
              keyTakeaways: content.keyTakeaways
            },
            imagePrompt,
            imageMetadata,
            aiModel: blogAIService.model,
            targetWordCount: this.targetWordCount,
            actualWordCount: content.content.split(/\s+/).length
          },
          categories: {
            create: [{
              category: {
                connect: { id: category.id }
              }
            }]
          },
          tags: {
            create: tags.map(tag => ({
              tag: {
                connect: { id: tag.id }
              }
            }))
          }
        },
        include: {
          author: true,
          categories: {
            include: {
              category: true
            }
          },
          tags: {
            include: {
              tag: true
            }
          }
        }
      });

      logger.info('Successfully generated daily blog post', {
        postId: blogPost.id,
        title: blogPost.title,
        status: blogPost.status,
        slug: blogPost.slug
      });

      return blogPost;
    } catch (error) {
      logger.error('Failed to generate daily blog post', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get recent blog posts
   * @param {number} days - Number of days to look back
   * @returns {Promise<Array>} Recent blog posts
   */
  async getRecentPosts(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return await prisma.blogPost.findMany({
      where: {
        createdAt: {
          gte: since
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        title: true,
        slug: true,
        isAutomated: true
      }
    });
  }

  /**
   * Find or create a blog category
   * @param {string} categoryName - Category name
   * @returns {Promise<Object>} Category object
   */
  async findOrCreateCategory(categoryName) {
    if (!categoryName) {
      // Return a default category
      categoryName = 'General';
    }

    let category = await prisma.blogCategory.findFirst({
      where: {
        name: {
          equals: categoryName,
          mode: 'insensitive'
        }
      }
    });

    if (!category) {
      const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      category = await prisma.blogCategory.create({
        data: {
          name: categoryName,
          slug: await this.generateUniqueSlug(slug, 'category'),
          description: `Posts about ${categoryName}`,
          color: this.getRandomColor()
        }
      });
      logger.info('Created new category', { category: categoryName });
    }

    return category;
  }

  /**
   * Find or create blog tags
   * @param {string[]} tagNames - Array of tag names
   * @returns {Promise<Array>} Array of tag objects
   */
  async findOrCreateTags(tagNames) {
    const uniqueTagNames = [...new Set(tagNames)].slice(0, 8); // Limit to 8 tags
    const tags = [];

    for (const tagName of uniqueTagNames) {
      if (!tagName || tagName.length < 2) continue;

      let tag = await prisma.blogTag.findFirst({
        where: {
          name: {
            equals: tagName,
            mode: 'insensitive'
          }
        }
      });

      if (!tag) {
        const slug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        tag = await prisma.blogTag.create({
          data: {
            name: tagName,
            slug: await this.generateUniqueSlug(slug, 'tag')
          }
        });
        logger.info('Created new tag', { tag: tagName });
      }

      tags.push(tag);
    }

    return tags;
  }

  /**
   * Generate a unique slug
   * @param {string} baseSlug - Base slug to make unique
   * @param {string} type - Type of entity ('post', 'category', 'tag')
   * @returns {Promise<string>} Unique slug
   */
  async generateUniqueSlug(baseSlug, type = 'post') {
    let slug = baseSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let counter = 1;
    let isUnique = false;

    while (!isUnique) {
      const testSlug = counter === 1 ? slug : `${slug}-${counter}`;

      let exists;
      if (type === 'category') {
        exists = await prisma.blogCategory.findUnique({
          where: { slug: testSlug }
        });
      } else if (type === 'tag') {
        exists = await prisma.blogTag.findUnique({
          where: { slug: testSlug }
        });
      } else {
        exists = await prisma.blogPost.findUnique({
          where: { slug: testSlug }
        });
      }

      if (!exists) {
        slug = testSlug;
        isUnique = true;
      } else {
        counter++;
      }
    }

    return slug;
  }

  /**
   * Get a random color for categories
   * @returns {string} Hex color
   */
  getRandomColor() {
    const colors = [
      '#3498DB', '#2ECC71', '#E74C3C', '#F39C12',
      '#9B59B6', '#1ABC9C', '#E67E22', '#34495E'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Get automation statistics
   * @returns {Promise<Object>} Statistics about automated posts
   */
  async getStatistics() {
    const [totalPosts, automatedPosts, publishedAutomated, draftAutomated] = await Promise.all([
      prisma.blogPost.count(),
      prisma.blogPost.count({ where: { isAutomated: true } }),
      prisma.blogPost.count({ where: { isAutomated: true, status: 'PUBLISHED' } }),
      prisma.blogPost.count({ where: { isAutomated: true, status: 'DRAFT' } })
    ]);

    const recentAutomated = await prisma.blogPost.findMany({
      where: { isAutomated: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        viewCount: true
      }
    });

    return {
      totalPosts,
      automatedPosts,
      publishedAutomated,
      draftAutomated,
      automationRate: totalPosts > 0 ? (automatedPosts / totalPosts * 100).toFixed(2) : 0,
      recentAutomated,
      isEnabled: this.isEnabled,
      autoPublish: this.autoPublish
    };
  }

  /**
   * Enable or disable automation
   * @param {boolean} enabled - Whether to enable automation
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    logger.info(`Blog automation ${enabled ? 'enabled' : 'disabled'}`);
  }
}

export default new BlogAutomationService();
