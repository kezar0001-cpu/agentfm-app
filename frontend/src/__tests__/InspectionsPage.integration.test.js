import { describe, it, expect } from 'vitest';
import ensureArray from '../utils/ensureArray';

/**
 * Integration tests for InspectionsPage data handling
 * These tests verify that the page correctly handles various API response formats
 */
describe('InspectionsPage data handling', () => {
  describe('inspections data extraction', () => {
    it('should extract inspections from nested data.items structure', () => {
      const apiResponse = {
        data: {
          items: [
            { id: '1', title: 'Inspection 1', status: 'SCHEDULED' },
            { id: '2', title: 'Inspection 2', status: 'COMPLETED' },
          ],
          pagination: {
            page: 1,
            pageSize: 20,
            total: 2,
            totalPages: 1,
          },
        },
        summary: {
          SCHEDULED: 1,
          COMPLETED: 1,
        },
        meta: {
          generatedAt: '2024-01-01T00:00:00Z',
        },
      };

      const inspections = ensureArray(apiResponse, ['data.items', 'items', 'data']);
      
      expect(inspections).toHaveLength(2);
      expect(inspections[0]).toHaveProperty('id', '1');
      expect(inspections[1]).toHaveProperty('id', '2');
    });

    it('should handle empty inspections list', () => {
      const apiResponse = {
        data: {
          items: [],
          pagination: {
            page: 1,
            pageSize: 20,
            total: 0,
            totalPages: 1,
          },
        },
        summary: {},
        meta: {
          generatedAt: '2024-01-01T00:00:00Z',
        },
      };

      const inspections = ensureArray(apiResponse, ['data.items', 'items', 'data']);
      
      expect(inspections).toEqual([]);
    });

    it('should handle malformed API response gracefully', () => {
      const apiResponse = {
        data: null,
        summary: {},
      };

      const inspections = ensureArray(apiResponse, ['data.items', 'items', 'data']);
      
      expect(inspections).toEqual([]);
    });
  });

  describe('properties data extraction', () => {
    it('should extract properties from properties key', () => {
      const apiResponse = {
        success: true,
        properties: [
          { id: '1', name: 'Property A', address: '123 Main St' },
          { id: '2', name: 'Property B', address: '456 Oak Ave' },
        ],
      };

      const properties = ensureArray(apiResponse, ['properties', 'data', 'items']);
      
      expect(properties).toHaveLength(2);
      expect(properties[0]).toHaveProperty('name', 'Property A');
      expect(properties[1]).toHaveProperty('name', 'Property B');
    });

    it('should handle empty properties list', () => {
      const apiResponse = {
        success: true,
        properties: [],
      };

      const properties = ensureArray(apiResponse, ['properties', 'data', 'items']);
      
      expect(properties).toEqual([]);
    });

    it('should handle missing properties key', () => {
      const apiResponse = {
        success: true,
      };

      const properties = ensureArray(apiResponse, ['properties', 'data', 'items']);
      
      expect(properties).toEqual([]);
    });
  });

  describe('backward compatibility', () => {
    it('should still work if API returns direct array', () => {
      const apiResponse = [
        { id: '1', title: 'Inspection 1' },
        { id: '2', title: 'Inspection 2' },
      ];

      const inspections = ensureArray(apiResponse, ['data.items', 'items', 'data']);
      
      expect(inspections).toHaveLength(2);
    });

    it('should work with simple data key', () => {
      const apiResponse = {
        data: [
          { id: '1', title: 'Inspection 1' },
          { id: '2', title: 'Inspection 2' },
        ],
      };

      const inspections = ensureArray(apiResponse, ['data.items', 'items', 'data']);
      
      expect(inspections).toHaveLength(2);
    });
  });

  describe('filtering and mapping operations', () => {
    it('should allow filtering extracted inspections', () => {
      const apiResponse = {
        data: {
          items: [
            { id: '1', title: 'Inspection 1', status: 'SCHEDULED' },
            { id: '2', title: 'Inspection 2', status: 'COMPLETED' },
            { id: '3', title: 'Inspection 3', status: 'SCHEDULED' },
          ],
        },
      };

      const inspections = ensureArray(apiResponse, ['data.items']);
      const scheduled = inspections.filter(i => i.status === 'SCHEDULED');
      
      expect(scheduled).toHaveLength(2);
      expect(scheduled.every(i => i.status === 'SCHEDULED')).toBe(true);
    });

    it('should allow mapping extracted properties', () => {
      const apiResponse = {
        properties: [
          { id: '1', name: 'Property A' },
          { id: '2', name: 'Property B' },
        ],
      };

      const properties = ensureArray(apiResponse, ['properties']);
      const names = properties.map(p => p.name);
      
      expect(names).toEqual(['Property A', 'Property B']);
    });
  });
});
