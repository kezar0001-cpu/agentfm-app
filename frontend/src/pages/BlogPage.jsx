import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  TextField,
  InputAdornment,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import { format } from 'date-fns';
import { getBlogPosts, getBlogCategories, getBlogTags } from '../api/blog';
import SEO from '../components/SEO';
import BlogLayout from '../components/BlogLayout';
import toast from 'react-hot-toast';

const BlogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 9,
    total: 0,
    totalPages: 0
  });

  // Get filter params from URL
  const page = parseInt(searchParams.get('page') || '1');
  const categoryFilter = searchParams.get('category') || '';
  const tagFilter = searchParams.get('tag') || '';
  const searchFilter = searchParams.get('search') || '';
  const [searchInput, setSearchInput] = useState(searchFilter);

  useEffect(() => {
    fetchPosts();
    fetchCategories();
    fetchTags();
  }, [page, categoryFilter, tagFilter, searchFilter]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 9,
        ...(categoryFilter && { category: categoryFilter }),
        ...(tagFilter && { tag: tagFilter }),
        ...(searchFilter && { search: searchFilter })
      };

      const response = await getBlogPosts(params);
      setPosts(response.data.posts);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
      toast.error('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await getBlogCategories();
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await getBlogTags();
      setTags(response.data);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handlePageChange = (event, value) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', value.toString());
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryChange = (e) => {
    const params = new URLSearchParams(searchParams);
    if (e.target.value) {
      params.set('category', e.target.value);
    } else {
      params.delete('category');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleTagChange = (tagSlug) => {
    const params = new URLSearchParams(searchParams);
    if (tagSlug) {
      params.set('tag', tagSlug);
    } else {
      params.delete('tag');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchInput) {
      params.set('search', searchInput);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams({});
  };

  const hasActiveFilters = categoryFilter || tagFilter || searchFilter;

  return (
    <BlogLayout>
      <SEO
        title="Blog"
        description="Read the latest insights, updates, and resources about property management from AgentFM"
        keywords={['property management', 'blog', 'real estate', 'maintenance', 'inspections']}
      />

      <Box
        sx={{
          bgcolor: 'background.default',
          minHeight: '100vh',
          pt: 8,
          pb: 8
        }}
      >
        <Container maxWidth="lg">
          {/* Header */}
          <Box sx={{ mb: 6, textAlign: 'center' }}>
            <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
              Our Blog
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
              Insights, tips, and stories from the world of property management
            </Typography>
          </Box>

          {/* Filters */}
          <Box sx={{ mb: 4 }}>
            <form onSubmit={handleSearch}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={5}>
                  <TextField
                    fullWidth
                    placeholder="Search articles..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={categoryFilter}
                      label="Category"
                      onChange={handleCategoryChange}
                    >
                      <MenuItem value="">All Categories</MenuItem>
                      {categories.map((cat) => (
                        <MenuItem key={cat.id} value={cat.slug}>
                          {cat.name} ({cat._count?.posts || 0})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={2}>
                  <Button
                    fullWidth
                    type="submit"
                    variant="contained"
                    size="large"
                  >
                    Search
                  </Button>
                </Grid>

                {hasActiveFilters && (
                  <Grid item xs={12} md={2}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="large"
                      onClick={clearFilters}
                    >
                      Clear Filters
                    </Button>
                  </Grid>
                )}
              </Grid>
            </form>
          </Box>

          {/* Active Filters Display */}
          {(tagFilter || categoryFilter) && (
            <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Filtering by:
              </Typography>
              {tagFilter && (
                <Chip
                  label={`Tag: ${tags.find(t => t.slug === tagFilter)?.name || tagFilter}`}
                  onDelete={() => handleTagChange('')}
                  color="primary"
                  variant="outlined"
                />
              )}
              {categoryFilter && (
                <Chip
                  label={`Category: ${categories.find(c => c.slug === categoryFilter)?.name || categoryFilter}`}
                  onDelete={handleCategoryChange}
                  color="secondary"
                  variant="outlined"
                />
              )}
            </Box>
          )}

          {/* Loading State */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : posts.length === 0 ? (
            /* Empty State */
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h5" color="text.secondary" gutterBottom>
                No posts found
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Try adjusting your filters or check back later for new content
              </Typography>
            </Box>
          ) : (
            <>
              {/* Blog Posts Grid */}
              <Grid container spacing={4}>
                {posts.map((post) => (
                  <Grid item xs={12} sm={6} md={4} key={post.id}>
                    <Card
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: 6
                        }
                      }}
                    >
                      {post.coverImage && (
                        <CardMedia
                          component="img"
                          height="200"
                          image={post.coverImage}
                          alt={post.title}
                          sx={{ objectFit: 'cover' }}
                        />
                      )}
                      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        {/* Categories */}
                        {post.categories && post.categories.length > 0 && (
                          <Box sx={{ mb: 1.5 }}>
                            {post.categories.slice(0, 2).map((pc) => (
                              <Chip
                                key={pc.category.id}
                                label={pc.category.name}
                                size="small"
                                sx={{
                                  mr: 0.5,
                                  bgcolor: pc.category.color || 'primary.main',
                                  color: 'white',
                                  fontWeight: 600
                                }}
                              />
                            ))}
                          </Box>
                        )}

                        {/* Title */}
                        <Typography
                          variant="h6"
                          component={Link}
                          to={`/blog/${post.slug}`}
                          sx={{
                            textDecoration: 'none',
                            color: 'text.primary',
                            fontWeight: 700,
                            mb: 1.5,
                            '&:hover': {
                              color: 'primary.main'
                            }
                          }}
                        >
                          {post.title}
                        </Typography>

                        {/* Excerpt */}
                        {post.excerpt && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              mb: 2,
                              flexGrow: 1,
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {post.excerpt}
                          </Typography>
                        )}

                        {/* Meta Info */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 'auto' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              {post.author?.firstName} {post.author?.lastName}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              {post.publishedAt && format(new Date(post.publishedAt), 'MMM d, yyyy')}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Tags */}
                        {post.tags && post.tags.length > 0 && (
                          <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {post.tags.slice(0, 3).map((pt) => (
                              <Chip
                                key={pt.tag.id}
                                label={pt.tag.name}
                                size="small"
                                variant="outlined"
                                onClick={() => handleTagChange(pt.tag.slug)}
                                sx={{ cursor: 'pointer' }}
                              />
                            ))}
                          </Box>
                        )}

                        {/* Read More Link */}
                        <Button
                          component={Link}
                          to={`/blog/${post.slug}`}
                          variant="text"
                          sx={{ mt: 2, alignSelf: 'flex-start' }}
                        >
                          Read More →
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    count={pagination.totalPages}
                    page={pagination.page}
                    onChange={handlePageChange}
                    color="primary"
                    size="large"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
            </>
          )}
        </Container>
      </Box>
    </BlogLayout>
  );
};

export default BlogPage;
