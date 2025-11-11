import logger from '../utils/logger.js';
import blogAutomationService from '../services/blogAutomationService.js';

const FALLBACK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

function createFallbackCron() {
  return {
    schedule(_expression, task) {
      const timer = setInterval(() => {
        try {
          const result = task();
          if (result?.catch) {
            result.catch((error) => {
              logger.error('Error running fallback blog automation task', {
                error: error.message,
              });
            });
          }
        } catch (error) {
          logger.error('Error executing fallback blog automation task', {
            error: error.message,
          });
        }
      }, FALLBACK_INTERVAL_MS);

      return {
        start: () => {},
        stop: () => clearInterval(timer),
      };
    },
  };
}

let cron;
try {
  const cronModule = await import('node-cron');
  cron = cronModule.default || cronModule;
} catch (error) {
  logger.warn('node-cron package unavailable for blog automation, falling back to interval scheduler.', {
    error: error.message,
  });
  cron = createFallbackCron();
}

// Default: Run at 9 AM daily (good time for blog publishing)
const DEFAULT_CRON_SCHEDULE = process.env.BLOG_CRON_SCHEDULE || '0 9 * * *';

function getTimezone() {
  return process.env.CRON_TIMEZONE || 'UTC';
}

/**
 * Process daily blog post generation
 */
export async function processDailyBlogPost() {
  try {
    logger.info('Starting automated blog post generation...');

    const blogPost = await blogAutomationService.generateDailyPost();

    if (blogPost) {
      logger.info('Successfully generated automated blog post', {
        postId: blogPost.id,
        title: blogPost.title,
        slug: blogPost.slug,
        status: blogPost.status,
      });
    } else {
      logger.info('Blog automation skipped (likely disabled)');
    }
  } catch (error) {
    logger.error('Failed to generate automated blog post', {
      error: error.message,
      stack: error.stack,
    });
  }
}

/**
 * Schedule the blog automation cron job
 */
export function scheduleBlogAutomationCron() {
  if (process.env.DISABLE_BLOG_AUTOMATION_CRON === 'true') {
    logger.warn('Blog automation cron job is disabled via configuration.');
    return null;
  }

  if (process.env.BLOG_AUTOMATION_ENABLED !== 'true') {
    logger.info('Blog automation is not enabled. Cron job will not be scheduled.');
    return null;
  }

  const timezone = getTimezone();

  logger.info(
    `Scheduling blog automation cron job with expression "${DEFAULT_CRON_SCHEDULE}" (${timezone}).`
  );

  const task = cron.schedule(
    DEFAULT_CRON_SCHEDULE,
    () => {
      processDailyBlogPost().catch((error) => {
        logger.error('Unhandled error in blog automation cron job', {
          error: error.message,
        });
      });
    },
    {
      timezone,
    }
  );

  // Optionally run on startup if configured
  if (process.env.BLOG_AUTOMATION_RUN_ON_STARTUP === 'true') {
    logger.info('Running blog automation on startup...');
    processDailyBlogPost().catch((error) => {
      logger.error('Initial blog automation run failed', {
        error: error.message,
      });
    });
  }

  return task;
}

export default scheduleBlogAutomationCron;
