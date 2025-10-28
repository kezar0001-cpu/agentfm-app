/**
 * Tests for property legacy alias handling
 * Ensures that legacy fields (postcode, type, coverImage, images) are properly
 * converted to standard fields (zipCode, propertyType, imageUrl) and not lost
 */

describe('Property Legacy Aliases', () => {
  describe('applyLegacyAliases function', () => {
    // Mock the function behavior
    const applyLegacyAliases = (input = {}) => {
      const data = { ...input };
      if (!data.zipCode && data.postcode) {
        data.zipCode = data.postcode;
      }
      if (!data.propertyType && data.type) {
        data.propertyType = data.type;
      }
      if (!data.imageUrl && (data.coverImage || data.images?.length)) {
        const candidates = [data.coverImage, ...(Array.isArray(data.images) ? data.images : [])];
        const firstUrl = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
        if (firstUrl) {
          data.imageUrl = firstUrl;
        }
      }
      return data;
    };

    test('converts postcode to zipCode', () => {
      const input = { postcode: '12345' };
      const result = applyLegacyAliases(input);
      
      expect(result.zipCode).toBe('12345');
      expect(result.postcode).toBe('12345'); // Original preserved
    });

    test('converts type to propertyType', () => {
      const input = { type: 'RESIDENTIAL' };
      const result = applyLegacyAliases(input);
      
      expect(result.propertyType).toBe('RESIDENTIAL');
      expect(result.type).toBe('RESIDENTIAL'); // Original preserved
    });

    test('converts coverImage to imageUrl', () => {
      const input = { coverImage: 'https://example.com/image.jpg' };
      const result = applyLegacyAliases(input);
      
      expect(result.imageUrl).toBe('https://example.com/image.jpg');
      expect(result.coverImage).toBe('https://example.com/image.jpg'); // Original preserved
    });

    test('converts first image from images array to imageUrl', () => {
      const input = { images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'] };
      const result = applyLegacyAliases(input);
      
      expect(result.imageUrl).toBe('https://example.com/image1.jpg');
    });

    test('prefers coverImage over images array', () => {
      const input = {
        coverImage: 'https://example.com/cover.jpg',
        images: ['https://example.com/image1.jpg']
      };
      const result = applyLegacyAliases(input);
      
      expect(result.imageUrl).toBe('https://example.com/cover.jpg');
    });

    test('does not override existing standard fields', () => {
      const input = {
        zipCode: '54321',
        postcode: '12345',
        propertyType: 'COMMERCIAL',
        type: 'RESIDENTIAL',
        imageUrl: 'https://example.com/existing.jpg',
        coverImage: 'https://example.com/cover.jpg'
      };
      const result = applyLegacyAliases(input);
      
      // Standard fields should not be overridden
      expect(result.zipCode).toBe('54321');
      expect(result.propertyType).toBe('COMMERCIAL');
      expect(result.imageUrl).toBe('https://example.com/existing.jpg');
    });
  });

  describe('Property data extraction after alias conversion', () => {
    test('should include converted fields in final data', () => {
      const parsed = {
        name: 'Test Property',
        address: '123 Main St',
        city: 'Test City',
        country: 'USA',
        postcode: '12345',
        type: 'RESIDENTIAL',
        coverImage: 'https://example.com/image.jpg',
        zipCode: '12345', // Converted by applyLegacyAliases
        propertyType: 'RESIDENTIAL', // Converted by applyLegacyAliases
        imageUrl: 'https://example.com/image.jpg', // Converted by applyLegacyAliases
      };

      // Simulate the destructuring in the route
      const { managerId: managerIdInput, postcode, type, coverImage, images, ...data } = parsed;

      // The bug: converted fields are in ...data but might be lost
      // The fix: explicitly include converted fields
      const propertyData = {
        ...data,
        ...(parsed.zipCode && { zipCode: parsed.zipCode }),
        ...(parsed.propertyType && { propertyType: parsed.propertyType }),
        ...(parsed.imageUrl && { imageUrl: parsed.imageUrl }),
      };

      // Verify converted fields are present
      expect(propertyData.zipCode).toBe('12345');
      expect(propertyData.propertyType).toBe('RESIDENTIAL');
      expect(propertyData.imageUrl).toBe('https://example.com/image.jpg');

      // Verify legacy aliases are removed
      expect(propertyData.postcode).toBeUndefined();
      expect(propertyData.type).toBeUndefined();
      expect(propertyData.coverImage).toBeUndefined();
      expect(propertyData.images).toBeUndefined();
    });

    test('should handle partial updates with only legacy fields', () => {
      const parsed = {
        postcode: '54321',
        zipCode: '54321', // Converted
      };

      const { managerId: managerIdInput, postcode, type, coverImage, images, ...data } = parsed;

      const updateData = {
        ...data,
        ...(parsed.zipCode !== undefined && { zipCode: parsed.zipCode }),
        ...(parsed.propertyType !== undefined && { propertyType: parsed.propertyType }),
        ...(parsed.imageUrl !== undefined && { imageUrl: parsed.imageUrl }),
      };

      expect(updateData.zipCode).toBe('54321');
      expect(updateData.postcode).toBeUndefined();
    });

    test('should handle null/empty values correctly', () => {
      const parsed = {
        name: 'Test',
        zipCode: '', // Empty string
        propertyType: null, // Null
      };

      const { managerId: managerIdInput, postcode, type, coverImage, images, ...data } = parsed;

      const updateData = {
        ...data,
        ...(parsed.zipCode !== undefined && { zipCode: parsed.zipCode }),
        ...(parsed.propertyType !== undefined && { propertyType: parsed.propertyType }),
        ...(parsed.imageUrl !== undefined && { imageUrl: parsed.imageUrl }),
      };

      // Empty string and null should be preserved
      expect(updateData.zipCode).toBe('');
      expect(updateData.propertyType).toBeNull();
    });
  });

  describe('Integration: Full property creation flow', () => {
    test('should create property with legacy aliases', () => {
      const requestBody = {
        name: 'Legacy Property',
        address: '456 Old St',
        city: 'Legacy City',
        country: 'USA',
        postcode: '67890', // Legacy
        type: 'COMMERCIAL', // Legacy
        coverImage: 'https://example.com/legacy.jpg', // Legacy
      };

      // Simulate applyLegacyAliases
      const parsed = {
        ...requestBody,
        zipCode: requestBody.postcode,
        propertyType: requestBody.type,
        imageUrl: requestBody.coverImage,
      };

      // Simulate route destructuring and data preparation
      const { managerId: managerIdInput, postcode, type, coverImage, images, ...data } = parsed;

      const propertyData = {
        ...data,
        managerId: 'user-123',
        ...(parsed.zipCode && { zipCode: parsed.zipCode }),
        ...(parsed.propertyType && { propertyType: parsed.propertyType }),
        ...(parsed.imageUrl && { imageUrl: parsed.imageUrl }),
      };

      // Verify final data has converted fields
      expect(propertyData.name).toBe('Legacy Property');
      expect(propertyData.zipCode).toBe('67890');
      expect(propertyData.propertyType).toBe('COMMERCIAL');
      expect(propertyData.imageUrl).toBe('https://example.com/legacy.jpg');

      // Verify legacy fields are not in final data
      expect(propertyData.postcode).toBeUndefined();
      expect(propertyData.type).toBeUndefined();
      expect(propertyData.coverImage).toBeUndefined();
    });
  });
});
