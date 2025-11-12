import Anthropic from '@anthropic-ai/sdk';
import logger from '../utils/logger.js';

class BlogAIService {
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // List of deprecated/unavailable Claude 3.x models that return 404 errors
    // These models are deprecated as of 2025 and being retired
    const deprecatedModels = [
      'claude-3-opus-20240229',      // Deprecated June 30, 2025, retiring January 5, 2026
      'claude-3-sonnet-20240229',    // Retired July 21, 2025
      'claude-3-haiku-20240307',     // Retired July 21, 2025
      'claude-3-5-sonnet-20241022',  // Being phased out
      'claude-3-5-sonnet-20240620'   // Being phased out
    ];

    // Priority list of working models (current as of November 2025)
    // Ordered by: cost-effectiveness, availability, and quality for blog content
    const workingModels = [
      'claude-3-5-haiku-20241022',   // Claude 3.5 Haiku - fastest, cheapest, widely available
      'claude-haiku-4-5-20251001',   // Claude 4.5 Haiku - available to all users
      'claude-sonnet-4-20250514',    // Claude 4 Sonnet - balanced, recommended by Anthropic
      'claude-sonnet-4-5-20250929'   // Claude 4.5 Sonnet - most powerful (more expensive)
    ];

    const envModel = process.env.ANTHROPIC_MODEL;

    // Check if environment variable has a deprecated/non-working model
    if (envModel && deprecatedModels.includes(envModel)) {
      logger.warn(`Environment variable ANTHROPIC_MODEL is set to "${envModel}" which is deprecated/unavailable.`);
      logger.warn(`Falling back to: ${workingModels[0]}`);
      logger.warn('Please update ANTHROPIC_MODEL environment variable to one of:');
      workingModels.forEach(m => logger.warn(`  - ${m}`));
      this.model = workingModels[0];
    } else if (envModel) {
      // Use environment variable if set and not deprecated
      this.model = envModel;
      logger.info(`Using environment variable ANTHROPIC_MODEL: ${this.model}`);
    } else {
      // Use default working model
      this.model = workingModels[0];
      logger.info(`No ANTHROPIC_MODEL set, using default: ${this.model}`);
    }

    // Store fallback models for retry logic
    this.fallbackModels = workingModels.filter(m => m !== this.model);

    logger.info(`Blog AI Service initialized with model: ${this.model}`);
    if (this.fallbackModels.length > 0) {
      logger.info(`Fallback models available: ${this.fallbackModels.join(', ')}`);
    }
  }

  /**
   * Make an API call with automatic retry on model 404 errors
   * @param {Function} apiCall - The API call function to execute
   * @param {string} operationName - Name of the operation for logging
   * @returns {Promise<any>} The API response
   */
  async _callWithRetry(apiCall, operationName) {
    const modelsToTry = [this.model, ...this.fallbackModels];

    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];

      try {
        logger.info(`${operationName}: Attempting with model: ${model}`);
        const result = await apiCall(model);

        // Success! Update the current model if we had to use a fallback
        if (model !== this.model) {
          logger.info(`${operationName}: Success with fallback model ${model}. Updating default model.`);
          this.model = model;
          // Update fallback list
          this.fallbackModels = modelsToTry.filter(m => m !== model);
        }

        return result;
      } catch (error) {
        const is404 = error.status === 404 || error.message?.includes('404') || error.message?.includes('not_found_error');
        const isLastModel = i === modelsToTry.length - 1;

        if (is404 && !isLastModel) {
          logger.warn(`${operationName}: Model ${model} returned 404. Trying next fallback model...`);
          continue;
        }

        // Either not a 404, or we've exhausted all models
        if (is404 && isLastModel) {
          logger.error(`${operationName}: All models failed with 404. This API key may have limited model access.`);
          logger.error('Please check your Anthropic API key tier and available models at https://console.anthropic.com/');
        }

        throw error;
      }
    }
  }

  /**
   * Safely extract and parse JSON from AI response
   * Handles control characters and malformed JSON that AI models sometimes produce
   * @param {string} responseText - Raw response text from AI
   * @param {string} operationName - Name of operation for logging
   * @returns {Object} Parsed JSON object
   */
  _parseAIJsonResponse(responseText, operationName = 'parseJSON') {
    try {
      // Extract JSON from response (may have markdown code blocks or other text)
      let jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        logger.error(`${operationName}: No JSON object found in response`);
        throw new Error('Failed to find JSON object in AI response');
      }

      let jsonString = jsonMatch[0];

      // Clean common control characters that break JSON parsing
      // Replace unescaped newlines, tabs, and other control chars in string values
      jsonString = jsonString
        .replace(/\\n/g, '\\n')  // Ensure \n is escaped
        .replace(/\\t/g, '\\t')  // Ensure \t is escaped
        .replace(/\\r/g, '\\r')  // Ensure \r is escaped
        // Fix unescaped control characters within JSON string values
        .replace(/("(?:[^"\\]|\\.)*")|[\x00-\x1F]/g, (match, stringMatch) => {
          // If it's a quoted string, keep it as is
          if (stringMatch) return stringMatch;
          // Otherwise, escape the control character
          return '\\u' + ('0000' + match.charCodeAt(0).toString(16)).slice(-4);
        });

      // Try to parse the cleaned JSON
      const parsed = JSON.parse(jsonString);
      return parsed;

    } catch (error) {
      // Provide detailed error logging
      logger.error(`${operationName}: JSON parsing failed`, {
        error: error.message,
        responsePreview: responseText.substring(0, 500) + '...'
      });

      // Try more aggressive cleaning for markdown content
      try {
        let jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found');

        let jsonString = jsonMatch[0];

        // More aggressive cleaning: replace actual newlines/tabs in strings
        jsonString = jsonString.replace(
          /"([^"]*(?:\\.[^"]*)*)"/g,
          (match, content) => {
            // This is a quoted string - escape any literal control chars
            const cleaned = content
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\r')
              .replace(/\t/g, '\\t')
              .replace(/[\x00-\x1F]/g, (ch) => '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4));
            return `"${cleaned}"`;
          }
        );

        const parsed = JSON.parse(jsonString);
        logger.warn(`${operationName}: JSON parsed after aggressive cleaning`);
        return parsed;

      } catch (secondError) {
        logger.error(`${operationName}: Failed even after aggressive cleaning`, {
          originalError: error.message,
          secondError: secondError.message
        });
        throw new Error(`Failed to parse JSON from AI response: ${error.message}`);
      }
    }
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
      const message = await this._callWithRetry(
        async (model) => {
          return await this.client.messages.create({
            model: model,
            max_tokens: 1024,
            messages: [{
              role: 'user',
              content: prompt
            }]
          });
        },
        'generateTopic'
      );

      const responseText = message.content[0].text;
      const topic = this._parseAIJsonResponse(responseText, 'generateTopic');
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
      const message = await this._callWithRetry(
        async (model) => {
          return await this.client.messages.create({
            model: model,
            max_tokens: 4096,
            messages: [{
              role: 'user',
              content: prompt
            }]
          });
        },
        'generateContent'
      );

      const responseText = message.content[0].text;
      const content = this._parseAIJsonResponse(responseText, 'generateContent');
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
