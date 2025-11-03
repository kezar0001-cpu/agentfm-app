import prisma from '../config/prismaClient.js';
import { sendEmail } from './email.js';
import emailTemplates from './emailTemplates.js';
import logger from './logger.js';

/**
 * Unified notification service that creates in-app notifications
 * and sends email notifications based on user preferences
 */

/**
 * Send a notification to a user
 * @param {string} userId - User ID to send notification to
 * @param {string} type - Notification type (from NotificationType enum)
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {object} options - Additional options
 * @param {string} options.entityType - Type of entity (e.g., 'job', 'inspection')
 * @param {string} options.entityId - ID of the entity
 * @param {boolean} options.sendEmail - Whether to send email (default: true)
 * @param {object} options.emailData - Data for email template
 */
export async function sendNotification(userId, type, title, message, options = {}) {
  try {
    // Create in-app notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        entityType: options.entityType || null,
        entityId: options.entityId || null,
      },
    });

    logger.info(`Created notification for user ${userId}: ${type}`);

    // Send email if requested and user exists
    if (options.sendEmail !== false) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, firstName: true, lastName: true },
        });

        if (user && user.email) {
          // Get email template based on notification type
          const templateKey = getTemplateKeyFromType(type);
          if (templateKey && emailTemplates[templateKey]) {
            const emailContent = emailTemplates[templateKey](options.emailData || {});
            await sendEmail(user.email, emailContent.subject, emailContent.html);
            logger.info(`Sent email notification to ${user.email}: ${type}`);
          }
        }
      } catch (emailError) {
        // Log email error but don't fail the notification
        logger.error(`Failed to send email notification: ${emailError.message}`);
      }
    }

    return notification;
  } catch (error) {
    logger.error(`Failed to send notification: ${error.message}`);
    throw error;
  }
}

/**
 * Send notification when a job is assigned to a technician
 */
export async function notifyJobAssigned(job, technician, property) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  return sendNotification(
    technician.id,
    'JOB_ASSIGNED',
    'New Job Assigned',
    `You have been assigned to: ${job.title}`,
    {
      entityType: 'job',
      entityId: job.id,
      emailData: {
        technicianName: `${technician.firstName} ${technician.lastName}`,
        jobTitle: job.title,
        propertyName: property.name,
        priority: job.priority,
        scheduledDate: job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString() : null,
        description: job.description,
        jobUrl: `${frontendUrl}/technician/jobs/${job.id}`,
      },
    }
  );
}

/**
 * Send notification when a job is completed
 */
export async function notifyJobCompleted(job, technician, property, manager) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  return sendNotification(
    manager.id,
    'JOB_COMPLETED',
    'Job Completed',
    `${technician.firstName} ${technician.lastName} completed: ${job.title}`,
    {
      entityType: 'job',
      entityId: job.id,
      emailData: {
        managerName: `${manager.firstName} ${manager.lastName}`,
        jobTitle: job.title,
        propertyName: property.name,
        technicianName: `${technician.firstName} ${technician.lastName}`,
        completedDate: new Date(job.completedDate).toLocaleDateString(),
        actualCost: job.actualCost,
        notes: job.notes,
        jobUrl: `${frontendUrl}/jobs/${job.id}`,
      },
    }
  );
}

/**
 * Send notification when a job is started
 */
export async function notifyJobStarted(job, property, manager) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  return sendNotification(
    manager.id,
    'JOB_ASSIGNED', // Reuse JOB_ASSIGNED type for status updates
    'Job Started',
    `Work has started on: ${job.title}`,
    {
      entityType: 'job',
      entityId: job.id,
      emailData: {
        managerName: `${manager.firstName} ${manager.lastName}`,
        jobTitle: job.title,
        propertyName: property.name,
        jobUrl: `${frontendUrl}/jobs/${job.id}`,
      },
    }
  );
}

/**
 * Send notification when a job is reassigned
 */
export async function notifyJobReassigned(job, previousTechnician, newTechnician, property) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  // Notify previous technician
  const prevNotification = sendNotification(
    previousTechnician.id,
    'JOB_ASSIGNED',
    'Job Reassigned',
    `You have been unassigned from: ${job.title}`,
    {
      entityType: 'job',
      entityId: job.id,
      emailData: {
        technicianName: `${previousTechnician.firstName} ${previousTechnician.lastName}`,
        jobTitle: job.title,
        propertyName: property.name,
        jobUrl: `${frontendUrl}/jobs/${job.id}`,
      },
    }
  );
  
  // Notify new technician
  const newNotification = notifyJobAssigned(job, newTechnician, property);
  
  return Promise.all([prevNotification, newNotification]);
}

/**
 * Send inspection reminder
 */
export async function notifyInspectionReminder(inspection, technician, property) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const scheduledDate = new Date(inspection.scheduledDate);
  const now = new Date();
  const hoursUntil = Math.round((scheduledDate - now) / (1000 * 60 * 60));
  
  let timeUntil;
  if (hoursUntil < 24) {
    timeUntil = `${hoursUntil} hours`;
  } else {
    timeUntil = `${Math.round(hoursUntil / 24)} days`;
  }
  
  return sendNotification(
    technician.id,
    'INSPECTION_REMINDER',
    'Inspection Reminder',
    `Upcoming inspection: ${inspection.title} at ${property.name}`,
    {
      entityType: 'inspection',
      entityId: inspection.id,
      emailData: {
        technicianName: `${technician.firstName} ${technician.lastName}`,
        inspectionTitle: inspection.title,
        propertyName: property.name,
        inspectionType: inspection.type,
        scheduledDate: scheduledDate.toLocaleDateString(),
        timeUntil,
        inspectionUrl: `${frontendUrl}/inspections/${inspection.id}`,
      },
    }
  );
}

/**
 * Send service request update notification
 */
export async function notifyServiceRequestUpdate(serviceRequest, tenant, property) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  return sendNotification(
    tenant.id,
    'SERVICE_REQUEST_UPDATE',
    'Service Request Update',
    `Your service request has been updated: ${serviceRequest.status}`,
    {
      entityType: 'serviceRequest',
      entityId: serviceRequest.id,
      emailData: {
        tenantName: `${tenant.firstName} ${tenant.lastName}`,
        requestTitle: serviceRequest.title,
        status: serviceRequest.status,
        category: serviceRequest.category,
        reviewNotes: serviceRequest.reviewNotes,
        jobCreated: serviceRequest.status === 'CONVERTED_TO_JOB',
        requestUrl: `${frontendUrl}/tenant/dashboard`,
      },
    }
  );
}

/**
 * Send trial expiring notification
 */
export async function notifyTrialExpiring(user, daysRemaining) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  return sendNotification(
    user.id,
    'SUBSCRIPTION_EXPIRING',
    'Trial Expiring Soon',
    `Your trial expires in ${daysRemaining} days`,
    {
      emailData: {
        userName: `${user.firstName} ${user.lastName}`,
        daysRemaining,
        upgradeUrl: `${frontendUrl}/subscriptions`,
      },
    }
  );
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(user) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  try {
    const emailContent = emailTemplates.welcomeEmail({
      userName: `${user.firstName} ${user.lastName}`,
      dashboardUrl: `${frontendUrl}/dashboard`,
    });
    
    await sendEmail(user.email, emailContent.subject, emailContent.html);
    logger.info(`Sent welcome email to ${user.email}`);
  } catch (error) {
    logger.error(`Failed to send welcome email: ${error.message}`);
  }
}

/**
 * Send notification when an inspection is completed
 */
export async function notifyInspectionCompleted(inspection, technician, property, manager, followUpJobs = []) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  return sendNotification(
    manager.id,
    'INSPECTION_COMPLETED',
    'Inspection Completed',
    `${technician.firstName} ${technician.lastName} completed inspection: ${inspection.title}`,
    {
      entityType: 'inspection',
      entityId: inspection.id,
      emailData: {
        managerName: `${manager.firstName} ${manager.lastName}`,
        inspectionTitle: inspection.title,
        propertyName: property.name,
        inspectionType: inspection.type,
        technicianName: `${technician.firstName} ${technician.lastName}`,
        completedDate: new Date(inspection.completedDate).toLocaleDateString(),
        findings: inspection.findings,
        notes: inspection.notes,
        followUpJobs: followUpJobs.map(job => ({
          title: job.title,
          description: job.description,
          priority: job.priority,
        })),
        inspectionUrl: `${frontendUrl}/inspections/${inspection.id}`,
      },
    }
  );
}

/**
 * Map notification type to email template key
 */
function getTemplateKeyFromType(type) {
  const mapping = {
    JOB_ASSIGNED: 'jobAssigned',
    JOB_COMPLETED: 'jobCompleted',
    INSPECTION_REMINDER: 'inspectionReminder',
    INSPECTION_COMPLETED: 'inspectionCompleted',
    SERVICE_REQUEST_UPDATE: 'serviceRequestUpdate',
    SUBSCRIPTION_EXPIRING: 'trialExpiring',
  };
  return mapping[type];
}

export default {
  sendNotification,
  notifyJobAssigned,
  notifyJobCompleted,
  notifyInspectionReminder,
  notifyInspectionCompleted,
  notifyServiceRequestUpdate,
  notifyTrialExpiring,
  sendWelcomeEmail,
};
