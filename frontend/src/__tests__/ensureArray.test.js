import { describe, it, expect } from 'vitest';
import ensureArray from '../utils/ensureArray';

describe('ensureArray', () => {
  describe('direct array input', () => {
    it('should return the array as-is when input is already an array', () => {
      const input = [1, 2, 3];
      expect(ensureArray(input)).toEqual([1, 2, 3]);
    });

    it('should return empty array when input is empty array', () => {
      expect(ensureArray([])).toEqual([]);
    });
  });

  describe('object with default keys', () => {
    it('should extract array from "data" key', () => {
      const input = { data: [1, 2, 3] };
      expect(ensureArray(input)).toEqual([1, 2, 3]);
    });

    it('should extract array from "items" key', () => {
      const input = { items: ['a', 'b', 'c'] };
      expect(ensureArray(input)).toEqual(['a', 'b', 'c']);
    });

    it('should extract array from "results" key', () => {
      const input = { results: [{ id: 1 }, { id: 2 }] };
      expect(ensureArray(input)).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should prioritize first matching key in order', () => {
      const input = { data: [1, 2], items: [3, 4], results: [5, 6] };
      expect(ensureArray(input)).toEqual([1, 2]);
    });
  });

  describe('object with custom keys', () => {
    it('should extract array using custom key', () => {
      const input = { properties: [{ id: 1 }, { id: 2 }] };
      expect(ensureArray(input, ['properties'])).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should try multiple custom keys in order', () => {
      const input = { inspections: [1, 2, 3] };
      expect(ensureArray(input, ['users', 'inspections', 'data'])).toEqual([1, 2, 3]);
    });
  });

  describe('nested path support', () => {
    it('should extract array from nested path "data.items"', () => {
      const input = { data: { items: [1, 2, 3] } };
      expect(ensureArray(input, ['data.items'])).toEqual([1, 2, 3]);
    });

    it('should extract array from deeply nested path', () => {
      const input = { response: { data: { results: ['a', 'b'] } } };
      expect(ensureArray(input, ['response.data.results'])).toEqual(['a', 'b']);
    });

    it('should handle missing intermediate keys gracefully', () => {
      const input = { data: {} };
      expect(ensureArray(input, ['data.items'])).toEqual([]);
    });

    it('should handle null intermediate values', () => {
      const input = { data: null };
      expect(ensureArray(input, ['data.items'])).toEqual([]);
    });

    it('should try multiple nested paths', () => {
      const input = { response: { items: [1, 2, 3] } };
      expect(ensureArray(input, ['data.items', 'response.items'])).toEqual([1, 2, 3]);
    });
  });

  describe('edge cases', () => {
    it('should return empty array for null input', () => {
      expect(ensureArray(null)).toEqual([]);
    });

    it('should return empty array for undefined input', () => {
      expect(ensureArray(undefined)).toEqual([]);
    });

    it('should return empty array for primitive values', () => {
      expect(ensureArray(42)).toEqual([]);
      expect(ensureArray('string')).toEqual([]);
      expect(ensureArray(true)).toEqual([]);
    });

    it('should return empty array when no matching keys found', () => {
      const input = { foo: 'bar', baz: 123 };
      expect(ensureArray(input)).toEqual([]);
    });

    it('should return empty array when keys exist but values are not arrays', () => {
      const input = { data: 'not an array', items: 123 };
      expect(ensureArray(input)).toEqual([]);
    });
  });

  describe('real-world API response scenarios', () => {
    it('should handle inspections API response structure', () => {
      const response = {
        data: {
          items: [
            { id: '1', title: 'Inspection 1' },
            { id: '2', title: 'Inspection 2' },
          ],
          pagination: { page: 1, total: 2 },
        },
        summary: {},
        meta: {},
      };
      expect(ensureArray(response, ['data.items'])).toEqual([
        { id: '1', title: 'Inspection 1' },
        { id: '2', title: 'Inspection 2' },
      ]);
    });

    it('should handle properties API response structure', () => {
      const response = {
        success: true,
        properties: [
          { id: '1', name: 'Property 1' },
          { id: '2', name: 'Property 2' },
        ],
      };
      expect(ensureArray(response, ['properties'])).toEqual([
        { id: '1', name: 'Property 1' },
        { id: '2', name: 'Property 2' },
      ]);
    });

    it('should handle empty results gracefully', () => {
      const response = {
        data: {
          items: [],
          pagination: { page: 1, total: 0 },
        },
      };
      expect(ensureArray(response, ['data.items'])).toEqual([]);
    });
  });
});
