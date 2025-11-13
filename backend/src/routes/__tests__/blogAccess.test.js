import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canViewBlogPost } from '../blog.js';

describe('canViewBlogPost', () => {
  it('allows published posts for anonymous visitors', () => {
    assert.equal(canViewBlogPost('PUBLISHED', undefined), true);
  });

  it('blocks unpublished posts for anonymous visitors', () => {
    assert.equal(canViewBlogPost('DRAFT', undefined), false);
  });

  it('allows admins to view unpublished posts', () => {
    assert.equal(canViewBlogPost('DRAFT', 'ADMIN'), true);
    assert.equal(canViewBlogPost('SCHEDULED', 'ADMIN'), true);
  });

  it('blocks non-admin users from unpublished posts', () => {
    assert.equal(canViewBlogPost('SCHEDULED', 'PROPERTY_MANAGER'), false);
    assert.equal(canViewBlogPost('DRAFT', 'OWNER'), false);
  });
});
