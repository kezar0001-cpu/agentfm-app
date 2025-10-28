import { describe, it, expect } from 'vitest';
import {
  STATUS_COLOR,
  TYPE_COLOR,
  INSPECTION_STATUS,
  INSPECTION_TYPE,
} from '../constants/inspections';

describe('Inspection Constants', () => {
  describe('STATUS_COLOR', () => {
    it('should have color mappings for all statuses', () => {
      expect(STATUS_COLOR.SCHEDULED).toBe('default');
      expect(STATUS_COLOR.IN_PROGRESS).toBe('info');
      expect(STATUS_COLOR.COMPLETED).toBe('success');
      expect(STATUS_COLOR.CANCELLED).toBe('error');
    });

    it('should have all required status keys', () => {
      const requiredKeys = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
      requiredKeys.forEach((key) => {
        expect(STATUS_COLOR).toHaveProperty(key);
      });
    });
  });

  describe('TYPE_COLOR', () => {
    it('should have color mappings for all types', () => {
      expect(TYPE_COLOR.ROUTINE).toBe('default');
      expect(TYPE_COLOR.MOVE_IN).toBe('primary');
      expect(TYPE_COLOR.MOVE_OUT).toBe('secondary');
      expect(TYPE_COLOR.EMERGENCY).toBe('error');
      expect(TYPE_COLOR.COMPLIANCE).toBe('warning');
    });

    it('should have all required type keys', () => {
      const requiredKeys = ['ROUTINE', 'MOVE_IN', 'MOVE_OUT', 'EMERGENCY', 'COMPLIANCE'];
      requiredKeys.forEach((key) => {
        expect(TYPE_COLOR).toHaveProperty(key);
      });
    });
  });

  describe('INSPECTION_STATUS', () => {
    it('should define all status constants', () => {
      expect(INSPECTION_STATUS.SCHEDULED).toBe('SCHEDULED');
      expect(INSPECTION_STATUS.IN_PROGRESS).toBe('IN_PROGRESS');
      expect(INSPECTION_STATUS.COMPLETED).toBe('COMPLETED');
      expect(INSPECTION_STATUS.CANCELLED).toBe('CANCELLED');
    });
  });

  describe('INSPECTION_TYPE', () => {
    it('should define all type constants', () => {
      expect(INSPECTION_TYPE.ROUTINE).toBe('ROUTINE');
      expect(INSPECTION_TYPE.MOVE_IN).toBe('MOVE_IN');
      expect(INSPECTION_TYPE.MOVE_OUT).toBe('MOVE_OUT');
      expect(INSPECTION_TYPE.EMERGENCY).toBe('EMERGENCY');
      expect(INSPECTION_TYPE.COMPLIANCE).toBe('COMPLIANCE');
    });
  });
});
