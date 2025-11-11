import Anthropic from '@anthropic-ai/sdk';
import logger from '../utils/logger.js';

class BlogAIService {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    // Using Claude 3 Opus for best content quality
    // Alternative models: claude-3-sonnet-20240229, claude-3-haiku-20240307
    // If you have access to Claude 3.5: claude-3-5-sonnet-20241022
    this.model = process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229';
  }

  /**
   * Generate a blog topic based on current trends and SEO considerations
   * @param {Object} options - Options for topic generation
   * @param {string[]} options.recentTopics - Recently used topics to avoid repetition
   * @param {string[]} options.categories - Available blog categories
   * @param {string} options.industry - Industry focus (e.g., 'facilities management', 'property management')
   * @returns {Promise<Object>} Topic details including title, keywords, and category
   */
  async generateTopic(options = {}) {
    const {
      recentTopics = [],
      categories = [],
      industry = 'facilities and property management'
    } = options;

    const prompt = `You are an expert content strategist specializing in ${industry}. Generate a compelling blog post topic that:

1. Is highly relevant to ${industry} professionals
2. Has strong SEO potential (trending keywords, search intent)
3. Has viral potential (shareable, engaging, addresses pain points)
4. Provides practical value to readers
5. Hasn't been covered recently (avoid these topics: ${recentTopics.join(', ') || 'none yet'})

${categories.length > 0 ? `Available categories: ${categories.join(', ')}` : ''}

Provide your response in JSON format:
{
  "title": "Compelling, SEO-optimized title (60-70 characters)",
  "slug": "url-friendly-slug",
  "category": "Most relevant category from the list",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "excerpt": "Brief 1-2 sentence description",
  "reasoning": "Why this topic is valuable for SEO, virality, and usefulness",
  "targetAudience": "Who will benefit most from this content",
  "searchIntent": "What problem or question this addresses"
}`;

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const responseText = message.content[0].text;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('Failed to parse JSON response from AI');
      }

      const topic = JSON.parse(jsonMatch[0]);
      logger.info('Generated blog topic', { topic });

      return topic;
    } catch (error) {
      logger.error('Error generating blog topic', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate full blog post content
   * @param {Object} topic - Topic details from generateTopic
   * @param {number} targetWordCount - Target word count for the article
   * @returns {Promise<Object>} Blog post content with HTML
   */
  async generateContent(topic, targetWordCount = 1500) {
    const prompt = `Write a comprehensive, high-quality blog post about "${topic.title}".

Target audience: ${topic.targetAudience}
Keywords to include naturally: ${topic.keywords.join(', ')}
Target word count: ${targetWordCount} words

Requirements:
1. Write in a professional yet engaging tone
2. Include practical, actionable advice
3. Use headers (H2, H3) to structure the content
4. Include bullet points and numbered lists where appropriate
5. Incorporate the keywords naturally throughout
6. Add a compelling introduction and conclusion
7. Make it shareable and valuable
8. Use real-world examples and case studies where relevant

Format your response in JSON:
{
  "content": "Full markdown content of the blog post",
  "htmlContent": "HTML version with proper formatting",
  "metaTitle": "SEO-optimized title (60 chars max)",
  "metaDescription": "Compelling meta description (155 chars max)",
  "suggestedTags": ["tag1", "tag2", "tag3", "tag4"],
  "readingTime": "Estimated reading time in minutes",
  "keyTakeaways": ["takeaway1", "takeaway2", "takeaway3"]
}`;

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const responseText = message.content[0].text;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('Failed to parse JSON response from AI');
      }

      const content = JSON.parse(jsonMatch[0]);
      logger.info('Generated blog content', {
        title: topic.title,
        wordCount: content.content.split(/\s+/).length
      });

      return content;
    } catch (error) {
      logger.error('Error generating blog content', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate an image prompt for the blog post
   * @param {Object} topic - Topic details
   * @param {string} content - Blog post content
   * @returns {Promise<string>} Image generation prompt
   */
  async generateImagePrompt(topic, content) {
    const prompt = `Based on this blog post topic and content, create a detailed image generation prompt for a professional cover image.

Topic: ${topic.title}
Keywords: ${topic.keywords.join(', ')}
Excerpt: ${topic.excerpt}

The image should:
1. Be professional and modern
2. Relate clearly to ${topic.category}
3. Be suitable for a business/professional blog
4. Avoid text or complex UI elements
5. Use colors that convey trust and professionalism

Provide a detailed, single-paragraph prompt for an AI image generator (like DALL-E or Stable Diffusion) that describes the visual style, composition, colors, and subject matter. Be specific but concise (100-150 words).`;

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const imagePrompt = message.content[0].text.trim();
      logger.info('Generated image prompt', { imagePrompt });

      return imagePrompt;
    } catch (error) {
      logger.error('Error generating image prompt', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze existing blog posts to identify content gaps and opportunities
   * @param {Array} existingPosts - Array of existing blog post objects
   * @returns {Promise<Object>} Analysis with recommendations
   */
  async analyzeContentGaps(existingPosts = []) {
    const topicSummary = existingPosts
      .slice(0, 20) // Last 20 posts
      .map(post => `- ${post.title}`)
      .join('\n');

    const prompt = `Analyze these recent blog posts and identify content gaps and opportunities:

${topicSummary || 'No recent posts'}

Provide strategic recommendations for new content that:
1. Fills gaps in the current content library
2. Targets emerging trends in facilities/property management
3. Addresses reader questions and pain points
4. Has high SEO potential

Format as JSON:
{
  "gaps": ["gap1", "gap2", "gap3"],
  "opportunities": ["opportunity1", "opportunity2"],
  "trendingTopics": ["topic1", "topic2", "topic3"],
  "recommendations": "Overall content strategy recommendation"
}`;

    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const responseText = message.content[0].text;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('Failed to parse JSON response from AI');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Error analyzing content gaps', { error: error.message });
      throw error;
    }
  }
}

export default new BlogAIService();
