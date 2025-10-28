import { describe, it, expect } from 'vitest';
import { formatDateTime, calculateDaysRemaining } from '../utils/date';

describe('formatDateTime', () => {
  it('should format a valid date string', () => {
    const dateString = '2024-01-15T14:30:00Z';
    const result = formatDateTime(dateString);
    expect(result).toMatch(/Jan 15, 2024/);
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('should return "—" for null or undefined', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime(undefined)).toBe('—');
    expect(formatDateTime('')).toBe('—');
  });

  it('should return "—" for invalid date strings', () => {
    expect(formatDateTime('invalid-date')).toBe('—');
    expect(formatDateTime('not a date')).toBe('—');
  });

  it('should handle ISO date strings', () => {
    const isoDate = new Date('2024-03-20T10:00:00Z').toISOString();
    const result = formatDateTime(isoDate);
    expect(result).toMatch(/Mar 20, 2024/);
  });
});

describe('calculateDaysRemaining', () => {
  it('should return null for null or undefined', () => {
    expect(calculateDaysRemaining(null)).toBe(null);
    expect(calculateDaysRemaining(undefined)).toBe(null);
  });

  it('should return null for invalid date strings', () => {
    expect(calculateDaysRemaining('invalid-date')).toBe(null);
  });

  it('should return 0 for expired dates', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    expect(calculateDaysRemaining(pastDate.toISOString())).toBe(0);
  });

  it('should calculate days remaining for future dates', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const result = calculateDaysRemaining(futureDate.toISOString());
    expect(result).toBeGreaterThanOrEqual(9);
    expect(result).toBeLessThanOrEqual(11);
  });
});
