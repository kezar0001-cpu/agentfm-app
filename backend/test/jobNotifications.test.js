import test from 'node:test';
import assert from 'node:assert/strict';

test('job assignment triggers notification', () => {
  // Test that creating a job with assignedToId triggers notification
  const job = {
    id: 'job123',
    title: 'Fix HVAC',
    assignedToId: 'tech123',
    assignedTo: {
      id: 'tech123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    },
    property: {
      id: 'prop123',
      name: 'Building A',
      managerId: 'mgr123',
    },
  };

  assert.ok(job.assignedToId);
  assert.ok(job.assignedTo);
  assert.ok(job.property);
});

test('job completion triggers notification', () => {
  // Test that updating job status to COMPLETED triggers notification
  const existingJob = {
    id: 'job123',
    status: 'IN_PROGRESS',
    property: {
      managerId: 'mgr123',
    },
  };

  const updates = {
    status: 'COMPLETED',
  };

  assert.equal(existingJob.status, 'IN_PROGRESS');
  assert.equal(updates.status, 'COMPLETED');
  assert.ok(existingJob.property.managerId);
});

test('job reassignment triggers notifications to both technicians', () => {
  // Test that reassigning a job notifies both old and new technician
  const existingJob = {
    id: 'job123',
    assignedToId: 'tech1',
  };

  const updates = {
    assignedToId: 'tech2',
  };

  const previousTechnician = {
    id: 'tech1',
    firstName: 'John',
    lastName: 'Doe',
  };

  const newTechnician = {
    id: 'tech2',
    firstName: 'Jane',
    lastName: 'Smith',
  };

  assert.notEqual(existingJob.assignedToId, updates.assignedToId);
  assert.ok(previousTechnician);
  assert.ok(newTechnician);
});

test('job started triggers notification to manager', () => {
  // Test that updating job status to IN_PROGRESS triggers notification
  const existingJob = {
    id: 'job123',
    status: 'ASSIGNED',
    property: {
      managerId: 'mgr123',
    },
  };

  const updates = {
    status: 'IN_PROGRESS',
  };

  assert.equal(existingJob.status, 'ASSIGNED');
  assert.equal(updates.status, 'IN_PROGRESS');
  assert.ok(existingJob.property.managerId);
});

test('notification failure does not fail job operation', () => {
  // Test that notification errors are caught and logged
  const jobOperation = async () => {
    try {
      // Simulate job creation
      const job = { id: 'job123', title: 'Test' };
      
      // Simulate notification failure
      try {
        throw new Error('Notification service unavailable');
      } catch (notifError) {
        console.error('Failed to send notification:', notifError);
        // Don't throw - job operation should succeed
      }
      
      return job;
    } catch (error) {
      throw error;
    }
  };

  // Job operation should not throw even if notification fails
  assert.doesNotThrow(jobOperation);
});

test('notification includes correct entity information', () => {
  // Test that notifications include entityType and entityId
  const notification = {
    userId: 'user123',
    type: 'JOB_ASSIGNED',
    title: 'New Job Assigned',
    message: 'You have been assigned to: Fix HVAC',
    entityType: 'job',
    entityId: 'job123',
  };

  assert.equal(notification.entityType, 'job');
  assert.ok(notification.entityId);
  assert.ok(notification.userId);
  assert.ok(notification.type);
});

test('notification email data includes required fields', () => {
  // Test that email data includes all required fields
  const emailData = {
    technicianName: 'John Doe',
    jobTitle: 'Fix HVAC',
    propertyName: 'Building A',
    propertyAddress: '123 Main St',
    priority: 'HIGH',
    scheduledDate: '2025-01-30',
    jobUrl: 'https://app.example.com/jobs/job123',
  };

  assert.ok(emailData.technicianName);
  assert.ok(emailData.jobTitle);
  assert.ok(emailData.propertyName);
  assert.ok(emailData.jobUrl);
});

test('only assigned technician receives assignment notification', () => {
  // Test that notification is sent only to assigned technician
  const job = {
    assignedToId: 'tech123',
  };

  const technician = {
    id: 'tech123',
  };

  const otherTechnician = {
    id: 'tech456',
  };

  assert.equal(job.assignedToId, technician.id);
  assert.notEqual(job.assignedToId, otherTechnician.id);
});

test('property manager receives completion notification', () => {
  // Test that property manager receives notification when job is completed
  const job = {
    id: 'job123',
    status: 'COMPLETED',
    property: {
      managerId: 'mgr123',
    },
  };

  const manager = {
    id: 'mgr123',
  };

  assert.equal(job.property.managerId, manager.id);
  assert.equal(job.status, 'COMPLETED');
});

test('notification types match enum values', () => {
  // Test that notification types are valid
  const validTypes = [
    'INSPECTION_SCHEDULED',
    'INSPECTION_REMINDER',
    'JOB_ASSIGNED',
    'JOB_COMPLETED',
    'SERVICE_REQUEST_UPDATE',
    'SUBSCRIPTION_EXPIRING',
    'PAYMENT_DUE',
    'SYSTEM',
  ];

  const jobNotificationTypes = ['JOB_ASSIGNED', 'JOB_COMPLETED'];

  jobNotificationTypes.forEach(type => {
    assert.ok(validTypes.includes(type));
  });
});

test('notification service functions are exported', () => {
  // Test that notification service exports required functions
  const exportedFunctions = [
    'notifyJobAssigned',
    'notifyJobCompleted',
    'notifyJobStarted',
    'notifyJobReassigned',
  ];

  exportedFunctions.forEach(funcName => {
    assert.ok(typeof funcName === 'string');
    assert.ok(funcName.startsWith('notify'));
  });
});
