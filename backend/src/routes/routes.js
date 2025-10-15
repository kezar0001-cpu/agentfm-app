const express = require('express');
const router = express.Router();
const propertyController = require('../../controllers/propertyController');
const unitController = require('../../controllers/unitController');
const dashboardController = require('../../controllers/dashboardController');
const inspectionController = require('../../controllers/inspectionController');
const jobController = require('../../controllers/jobController');
const serviceRequestController = require('../../controllers/serviceRequestController');
const { authenticate } = require('../middleware/auth');

// ============================================
// PROPERTY ROUTES
// ============================================

/**
 * @route   GET /api/properties
 * @desc    Get all properties for authenticated user
 * @access  Private (All roles)
 */
router.get('/properties', authenticate, propertyController.getProperties);

/**
 * @route   GET /api/properties/:id
 * @desc    Get a single property by ID
 * @access  Private (All roles with access)
 */
router.get('/properties/:id', authenticate, propertyController.getPropertyById);

/**
 * @route   POST /api/properties
 * @desc    Create a new property
 * @access  Private (Property Manager only)
 */
router.post('/properties', authenticate, propertyController.createProperty);

/**
 * @route   PATCH /api/properties/:id
 * @desc    Update a property
 * @access  Private (Property Manager only)
 */
router.patch('/properties/:id', authenticate, propertyController.updateProperty);

/**
 * @route   DELETE /api/properties/:id
 * @desc    Delete a property
 * @access  Private (Property Manager only)
 */
router.delete('/properties/:id', authenticate, propertyController.deleteProperty);

/**
 * @route   POST /api/properties/:id/owners
 * @desc    Assign an owner to a property
 * @access  Private (Property Manager only)
 */
router.post('/properties/:id/owners', authenticate, propertyController.assignOwner);

/**
 * @route   DELETE /api/properties/:id/owners/:ownerId
 * @desc    Remove an owner from a property
 * @access  Private (Property Manager only)
 */
router.delete('/properties/:id/owners/:ownerId', authenticate, propertyController.removeOwner);

// ============================================
// UNIT ROUTES
// ============================================

/**
 * @route   GET /api/units
 * @desc    Get all units for a property
 * @access  Private (All roles with access)
 * @query   propertyId (required)
 */
router.get('/units', authenticate, unitController.getUnits);

/**
 * @route   GET /api/units/:id
 * @desc    Get a single unit by ID
 * @access  Private (All roles with access)
 */
router.get('/units/:id', authenticate, unitController.getUnitById);

/**
 * @route   POST /api/units
 * @desc    Create a new unit
 * @access  Private (Property Manager only)
 */
router.post('/units', authenticate, unitController.createUnit);

/**
 * @route   PATCH /api/units/:id
 * @desc    Update a unit
 * @access  Private (Property Manager only)
 */
router.patch('/units/:id', authenticate, unitController.updateUnit);

/**
 * @route   DELETE /api/units/:id
 * @desc    Delete a unit
 * @access  Private (Property Manager only)
 */
router.delete('/units/:id', authenticate, unitController.deleteUnit);

/**
 * @route   POST /api/units/:id/tenants
 * @desc    Assign a tenant to a unit
 * @access  Private (Property Manager only)
 */
router.post('/units/:id/tenants', authenticate, unitController.assignTenant);

/**
 * @route   DELETE /api/units/:id/tenants/:tenantId
 * @desc    Remove a tenant from a unit
 * @access  Private (Property Manager only)
 */
router.delete('/units/:id/tenants/:tenantId', authenticate, unitController.removeTenant);

// ============================================
// DASHBOARD ROUTES
// ============================================

/**
 * @route   GET /api/dashboard/summary
 * @desc    Get dashboard summary with stats and alerts
 * @access  Private (All roles)
 */
router.get('/dashboard/summary', authenticate, dashboardController.getDashboardSummary);

/**
 * @route   GET /api/dashboard/activity
 * @desc    Get recent activity feed
 * @access  Private (All roles)
 */
router.get('/dashboard/activity', authenticate, dashboardController.getRecentActivity);

// ============================================
// INSPECTION ROUTES
// ============================================

/**
 * @route   GET /api/inspections
 * @desc    Get all inspections
 * @access  Private (All roles with access)
 */
router.get('/inspections', authenticate, inspectionController.getInspections);

/**
 * @route   GET /api/inspections/:id
 * @desc    Get a single inspection by ID
 * @access  Private (All roles with access)
 */
router.get('/inspections/:id', authenticate, inspectionController.getInspectionById);

/**
 * @route   POST /api/inspections
 * @desc    Create a new inspection
 * @access  Private (Property Manager only)
 */
router.post('/inspections', authenticate, inspectionController.createInspection);

/**
 * @route   PATCH /api/inspections/:id
 * @desc    Update an inspection
 * @access  Private (Property Manager or assigned Technician)
 */
router.patch('/inspections/:id', authenticate, inspectionController.updateInspection);

/**
 * @route   POST /api/inspections/:id/complete
 * @desc    Complete an inspection
 * @access  Private (Assigned Technician only)
 */
router.post('/inspections/:id/complete', authenticate, inspectionController.completeInspection);

/**
 * @route   DELETE /api/inspections/:id
 * @desc    Delete an inspection
 * @access  Private (Property Manager only)
 */
router.delete('/inspections/:id', authenticate, inspectionController.deleteInspection);

// ============================================
// JOB ROUTES
// ============================================

/**
 * @route   GET /api/jobs
 * @desc    Get all jobs
 * @access  Private (All roles with access)
 */
router.get('/jobs', authenticate, jobController.getJobs);

/**
 * @route   GET /api/jobs/:id
 * @desc    Get a single job by ID
 * @access  Private (All roles with access)
 */
router.get('/jobs/:id', authenticate, jobController.getJobById);

/**
 * @route   POST /api/jobs
 * @desc    Create a new job
 * @access  Private (Property Manager only)
 */
router.post('/jobs', authenticate, jobController.createJob);

/**
 * @route   PATCH /api/jobs/:id
 * @desc    Update a job
 * @access  Private (Property Manager or assigned Technician)
 */
router.patch('/jobs/:id', authenticate, jobController.updateJob);

/**
 * @route   DELETE /api/jobs/:id
 * @desc    Delete a job
 * @access  Private (Property Manager only)
 */
router.delete('/jobs/:id', authenticate, jobController.deleteJob);

// ============================================
// SERVICE REQUEST ROUTES
// ============================================

/**
 * @route   GET /api/service-requests
 * @desc    Get all service requests
 * @access  Private (All roles with access)
 */
router.get('/service-requests', authenticate, serviceRequestController.getServiceRequests);

/**
 * @route   GET /api/service-requests/:id
 * @desc    Get a single service request by ID
 * @access  Private (All roles with access)
 */
router.get('/service-requests/:id', authenticate, serviceRequestController.getServiceRequestById);

/**
 * @route   POST /api/service-requests
 * @desc    Create a new service request
 * @access  Private (Tenant or Property Manager)
 */
router.post('/service-requests', authenticate, serviceRequestController.createServiceRequest);

/**
 * @route   PATCH /api/service-requests/:id
 * @desc    Update a service request (review/response)
 * @access  Private (Property Manager only)
 */
router.patch('/service-requests/:id', authenticate, serviceRequestController.updateServiceRequest);

/**
 * @route   POST /api/service-requests/:id/convert-to-job
 * @desc    Convert a service request to a job
 * @access  Private (Property Manager only)
 */
router.post('/service-requests/:id/convert-to-job', authenticate, serviceRequestController.convertToJob);

/**
 * @route   DELETE /api/service-requests/:id
 * @desc    Delete a service request
 * @access  Private (Requester or Property Manager)
 */
router.delete('/service-requests/:id', authenticate, serviceRequestController.deleteServiceRequest);

module.exports = router;
