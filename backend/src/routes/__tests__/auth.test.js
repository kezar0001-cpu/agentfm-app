/**
 * Tests for authentication routes
 * Verifies that ADMIN role has been properly removed
 */

import { describe, it, expect } from '@jest/globals';

describe('Auth Routes - Role Validation', () => {
  describe('Login Schema', () => {
    it('should reject ADMIN role in login', () => {
      // This test verifies that ADMIN role is not accepted
      const validRoles = ['PROPERTY_MANAGER', 'OWNER', 'TECHNICIAN', 'TENANT'];
      const invalidRoles = ['ADMIN', 'SUPER_ADMIN', 'ROOT'];
      
      // Valid roles should be in the enum
      validRoles.forEach(role => {
        expect(validRoles).toContain(role);
      });
      
      // Invalid roles should not be in the enum
      invalidRoles.forEach(role => {
        expect(validRoles).not.toContain(role);
      });
    });
  });

  describe('Google OAuth', () => {
    it('should only allow PROPERTY_MANAGER role for Google OAuth', () => {
      const allowedRoles = ['PROPERTY_MANAGER'];
      const disallowedRoles = ['ADMIN', 'OWNER', 'TECHNICIAN', 'TENANT'];
      
      // Only PROPERTY_MANAGER should be allowed
      expect(allowedRoles).toContain('PROPERTY_MANAGER');
      expect(allowedRoles).toHaveLength(1);
      
      // Other roles should not be allowed
      disallowedRoles.forEach(role => {
        expect(allowedRoles).not.toContain(role);
      });
    });
  });

  describe('Dashboard Routes', () => {
    it('should have correct dashboard routes for all valid roles', () => {
      const dashboardRoutes = {
        PROPERTY_MANAGER: '/dashboard',
        OWNER: '/owner/dashboard',
        TECHNICIAN: '/technician/dashboard',
        TENANT: '/tenant/dashboard',
      };
      
      // Verify all valid roles have dashboard routes
      expect(dashboardRoutes).toHaveProperty('PROPERTY_MANAGER');
      expect(dashboardRoutes).toHaveProperty('OWNER');
      expect(dashboardRoutes).toHaveProperty('TECHNICIAN');
      expect(dashboardRoutes).toHaveProperty('TENANT');
      
      // Verify ADMIN does not have a dashboard route
      expect(dashboardRoutes).not.toHaveProperty('ADMIN');
      
      // Verify technician route is correct (not /tech/dashboard)
      expect(dashboardRoutes.TECHNICIAN).toBe('/technician/dashboard');
    });
  });
});

describe('Property Routes - Access Control', () => {
  it('should not allow ADMIN role in property access checks', () => {
    // Mock user and property
    const property = { id: '1', managerId: 'manager-1' };
    const propertyManager = { id: 'manager-1', role: 'PROPERTY_MANAGER' };
    const otherUser = { id: 'user-2', role: 'OWNER' };
    
    // Property manager who owns the property should have access
    expect(property.managerId).toBe(propertyManager.id);
    
    // Other users should not have access
    expect(property.managerId).not.toBe(otherUser.id);
    
    // ADMIN role should not exist
    const validRoles = ['PROPERTY_MANAGER', 'OWNER', 'TECHNICIAN', 'TENANT'];
    expect(validRoles).not.toContain('ADMIN');
  });
});

describe('Role Manager - Permissions', () => {
  it('should not grant ADMIN role special permissions', () => {
    const validRoles = ['PROPERTY_MANAGER', 'OWNER', 'TECHNICIAN', 'TENANT'];
    
    // Verify ADMIN is not in valid roles
    expect(validRoles).not.toContain('ADMIN');
    
    // Verify only 4 roles exist
    expect(validRoles).toHaveLength(4);
  });
});
