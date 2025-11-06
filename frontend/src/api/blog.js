import api from './client';

/**
 * Blog API Service
 * Handles all blog-related API calls
 */

// ==================== PUBLIC ENDPOINTS ====================

/**
 * Get published blog posts (public)
 * @param {Object} params - Query parameters
 * @returns {Promise} - Posts and pagination data
 */
export const getBlogPosts = (params = {}) => {
  return api.get('/blog/posts', { params });
};

/**
 * Get single blog post by slug (public)
 * @param {string} slug - Post slug
 * @returns {Promise} - Post data
 */
export const getBlogPost = (slug) => {
  return api.get(`/blog/posts/${slug}`);
};

/**
 * Get all blog categories (public)
 * @returns {Promise} - Array of categories
 */
export const getBlogCategories = () => {
  return api.get('/blog/categories');
};

/**
 * Get all blog tags (public)
 * @returns {Promise} - Array of tags
 */
export const getBlogTags = () => {
  return api.get('/blog/tags');
};

// ==================== ADMIN ENDPOINTS ====================

/**
 * Get all blog posts (admin only)
 * @param {Object} params - Query parameters
 * @returns {Promise} - Posts and pagination data
 */
export const getAdminBlogPosts = (params = {}) => {
  return api.get('/blog/admin/posts', { params });
};

/**
 * Get single blog post by ID (admin only)
 * @param {string} id - Post ID
 * @returns {Promise} - Post data
 */
export const getAdminBlogPost = (id) => {
  return api.get(`/blog/admin/posts/${id}`);
};

/**
 * Create new blog post (admin only)
 * @param {Object} data - Post data
 * @returns {Promise} - Created post
 */
export const createBlogPost = (data) => {
  return api.post('/blog/admin/posts', data);
};

/**
 * Update blog post (admin only)
 * @param {string} id - Post ID
 * @param {Object} data - Updated post data
 * @returns {Promise} - Updated post
 */
export const updateBlogPost = (id, data) => {
  return api.put(`/blog/admin/posts/${id}`, data);
};

/**
 * Delete blog post (admin only)
 * @param {string} id - Post ID
 * @returns {Promise} - Success response
 */
export const deleteBlogPost = (id) => {
  return api.delete(`/blog/admin/posts/${id}`);
};

// ==================== CATEGORY ADMIN ENDPOINTS ====================

/**
 * Create new category (admin only)
 * @param {Object} data - Category data
 * @returns {Promise} - Created category
 */
export const createBlogCategory = (data) => {
  return api.post('/blog/admin/categories', data);
};

/**
 * Update category (admin only)
 * @param {string} id - Category ID
 * @param {Object} data - Updated category data
 * @returns {Promise} - Updated category
 */
export const updateBlogCategory = (id, data) => {
  return api.put(`/blog/admin/categories/${id}`, data);
};

/**
 * Delete category (admin only)
 * @param {string} id - Category ID
 * @returns {Promise} - Success response
 */
export const deleteBlogCategory = (id) => {
  return api.delete(`/blog/admin/categories/${id}`);
};

// ==================== TAG ADMIN ENDPOINTS ====================

/**
 * Create new tag (admin only)
 * @param {Object} data - Tag data
 * @returns {Promise} - Created tag
 */
export const createBlogTag = (data) => {
  return api.post('/blog/admin/tags', data);
};

/**
 * Update tag (admin only)
 * @param {string} id - Tag ID
 * @param {Object} data - Updated tag data
 * @returns {Promise} - Updated tag
 */
export const updateBlogTag = (id, data) => {
  return api.put(`/blog/admin/tags/${id}`, data);
};

/**
 * Delete tag (admin only)
 * @param {string} id - Tag ID
 * @returns {Promise} - Success response
 */
export const deleteBlogTag = (id) => {
  return api.delete(`/blog/admin/tags/${id}`);
};
