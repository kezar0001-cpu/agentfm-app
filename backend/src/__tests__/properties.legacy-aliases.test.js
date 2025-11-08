import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import propertiesRouter from '../routes/properties.js';

const { applyLegacyAliases, resolvePrimaryImageUrl } = propertiesRouter._test;

describe('Property Legacy Aliases', () => {
  describe('applyLegacyAliases function', () => {
    it('converts postcode to zipCode', () => {
      const input = { postcode: '12345' };
      const result = applyLegacyAliases(input);

      assert.equal(result.zipCode, '12345');
      assert.equal(result.postcode, '12345');
    });

    it('converts type to propertyType', () => {
      const input = { type: 'RESIDENTIAL' };
      const result = applyLegacyAliases(input);

      assert.equal(result.propertyType, 'RESIDENTIAL');
      assert.equal(result.type, 'RESIDENTIAL');
    });

    it('converts coverImage to imageUrl', () => {
      const input = { coverImage: 'https://example.com/image.jpg' };
      const result = applyLegacyAliases(input);

      assert.equal(result.imageUrl, 'https://example.com/image.jpg');
      assert.equal(result.coverImage, 'https://example.com/image.jpg');
    });

    it('converts first image from images array to imageUrl', () => {
      const input = { images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'] };
      const result = applyLegacyAliases(input);

      assert.equal(result.imageUrl, 'https://example.com/image1.jpg');
    });

    it('prefers coverImage over images array', () => {
      const input = {
        coverImage: 'https://example.com/cover.jpg',
        images: ['https://example.com/image1.jpg'],
      };
      const result = applyLegacyAliases(input);

      assert.equal(result.imageUrl, 'https://example.com/cover.jpg');
    });

    it('does not override existing standard fields', () => {
      const input = {
        zipCode: '54321',
        postcode: '12345',
        propertyType: 'COMMERCIAL',
        type: 'RESIDENTIAL',
        imageUrl: 'https://example.com/existing.jpg',
        coverImage: 'https://example.com/cover.jpg',
      };
      const result = applyLegacyAliases(input);

      assert.equal(result.zipCode, '54321');
      assert.equal(result.propertyType, 'COMMERCIAL');
      assert.equal(result.imageUrl, 'https://example.com/existing.jpg');
    });
  });

  describe('Property data extraction after alias conversion', () => {
    it('includes converted fields in final data', () => {
      const parsed = {
        name: 'Test Property',
        address: '123 Main St',
        city: 'Test City',
        country: 'USA',
        postcode: '12345',
        type: 'RESIDENTIAL',
        coverImage: 'https://example.com/image.jpg',
        zipCode: '12345',
        propertyType: 'RESIDENTIAL',
        imageUrl: 'https://example.com/image.jpg',
      };

      const { managerId: _managerIdInput, postcode, type, coverImage, images, ...data } = parsed;

      const propertyData = {
        ...data,
        ...(parsed.zipCode && { zipCode: parsed.zipCode }),
        ...(parsed.propertyType && { propertyType: parsed.propertyType }),
        ...(parsed.imageUrl && { imageUrl: parsed.imageUrl }),
      };

      assert.equal(propertyData.zipCode, '12345');
      assert.equal(propertyData.propertyType, 'RESIDENTIAL');
      assert.equal(propertyData.imageUrl, 'https://example.com/image.jpg');

      assert.equal(propertyData.postcode, undefined);
      assert.equal(propertyData.type, undefined);
      assert.equal(propertyData.coverImage, undefined);
      assert.equal(propertyData.images, undefined);
    });

    it('handles partial updates with only legacy fields', () => {
      const parsed = {
        postcode: '54321',
        zipCode: '54321',
      };

      const { managerId: _managerIdInput, postcode, type, coverImage, images, ...data } = parsed;

      const updateData = {
        ...data,
        ...(parsed.zipCode !== undefined && { zipCode: parsed.zipCode }),
        ...(parsed.propertyType !== undefined && { propertyType: parsed.propertyType }),
        ...(parsed.imageUrl !== undefined && { imageUrl: parsed.imageUrl }),
      };

      assert.equal(updateData.zipCode, '54321');
      assert.equal(updateData.postcode, undefined);
    });

    it('preserves null or empty values', () => {
      const parsed = {
        name: 'Test',
        zipCode: '',
        propertyType: null,
      };

      const { managerId: _managerIdInput, postcode, type, coverImage, images, ...data } = parsed;

      const updateData = {
        ...data,
        ...(parsed.zipCode !== undefined && { zipCode: parsed.zipCode }),
        ...(parsed.propertyType !== undefined && { propertyType: parsed.propertyType }),
        ...(parsed.imageUrl !== undefined && { imageUrl: parsed.imageUrl }),
      };

      assert.equal(updateData.zipCode, '');
      assert.equal(updateData.propertyType, null);
    });
  });

  describe('Integration: Full property creation flow', () => {
    it('creates property data with legacy aliases', () => {
      const requestBody = {
        name: 'Legacy Property',
        address: '456 Old St',
        city: 'Legacy City',
        country: 'USA',
        postcode: '67890',
        type: 'COMMERCIAL',
        coverImage: 'https://example.com/legacy.jpg',
      };

      const parsed = applyLegacyAliases(requestBody);

      const { managerId: _managerIdInput, postcode, type, coverImage, images, ...data } = parsed;

      const propertyData = {
        ...data,
        managerId: 'user-123',
        ...(parsed.zipCode && { zipCode: parsed.zipCode }),
        ...(parsed.propertyType && { propertyType: parsed.propertyType }),
        ...(parsed.imageUrl && { imageUrl: parsed.imageUrl }),
      };

      assert.equal(propertyData.name, 'Legacy Property');
      assert.equal(propertyData.zipCode, '67890');
      assert.equal(propertyData.propertyType, 'COMMERCIAL');
      assert.equal(propertyData.imageUrl, 'https://example.com/legacy.jpg');

      assert.equal(propertyData.postcode, undefined);
      assert.equal(propertyData.type, undefined);
      assert.equal(propertyData.coverImage, undefined);
    });
  });
});

describe('resolvePrimaryImageUrl', () => {
  it('returns null when there are no images', () => {
    assert.equal(resolvePrimaryImageUrl([]), null);
    assert.equal(resolvePrimaryImageUrl(null), null);
  });

  it('prefers explicitly marked primary images', () => {
    const images = [
      { imageUrl: 'https://example.com/secondary.jpg', isPrimary: false, displayOrder: 0 },
      { imageUrl: 'https://example.com/primary.jpg', isPrimary: true, displayOrder: 5 },
    ];

    assert.equal(resolvePrimaryImageUrl(images), 'https://example.com/primary.jpg');
  });

  it('falls back to display order when no primary exists', () => {
    const images = [
      { imageUrl: 'https://example.com/second.jpg', displayOrder: 2 },
      { imageUrl: 'https://example.com/first.jpg', displayOrder: 0 },
    ];

    assert.equal(resolvePrimaryImageUrl(images), 'https://example.com/first.jpg');
  });

  it('uses creation time as a final tiebreaker', () => {
    const images = [
      {
        imageUrl: 'https://example.com/newer.jpg',
        displayOrder: 0,
        createdAt: new Date('2024-02-01').toISOString(),
      },
      {
        imageUrl: 'https://example.com/older.jpg',
        displayOrder: 0,
        createdAt: new Date('2024-01-01').toISOString(),
      },
    ];

    assert.equal(resolvePrimaryImageUrl(images), 'https://example.com/older.jpg');
  });

  it('ignores images without usable URLs', () => {
    const images = [
      { imageUrl: '', isPrimary: true },
      { imageUrl: '   ', displayOrder: 0 },
      { imageUrl: 'https://example.com/valid.jpg', displayOrder: 1 },
    ];

    assert.equal(resolvePrimaryImageUrl(images), 'https://example.com/valid.jpg');
  });
});
