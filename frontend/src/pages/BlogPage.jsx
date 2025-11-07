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
import BlogPublicNav from '../components/BlogPublicNav';
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
    <>
      <SEO
        title="Blog"
        description="Read the latest insights, updates, and resources about property management from Buildstate FM"
        keywords={['property management', 'blog', 'real estate', 'maintenance', 'inspections']}
      />

      <BlogPublicNav />

      <Box
        sx={{
          minHeight: '100vh',
          pt: 8,
          pb: 8,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3), transparent 50%), radial-gradient(circle at 80% 80%, rgba(253, 216, 53, 0.15), transparent 50%)',
            pointerEvents: 'none'
          }
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          {/* Header */}
          <Box sx={{
            mb: 6,
            textAlign: 'center',
            pt: 4,
            pb: 2
          }}>
            <Typography variant="h2" component="h1" gutterBottom sx={{
              fontWeight: 800,
              color: 'white',
              textShadow: '0 2px 20px rgba(0,0,0,0.2)',
              mb: 2
            }}>
              Our Blog
            </Typography>
            <Typography variant="h5" sx={{
              maxWidth: 700,
              mx: 'auto',
              color: 'rgba(255,255,255,0.95)',
              fontWeight: 400,
              textShadow: '0 1px 10px rgba(0,0,0,0.1)'
            }}>
              Insights, tips, and stories from the world of property management
            </Typography>
          </Box>

          {/* Filters */}
          <Box sx={{
            mb: 4,
            p: 3,
            borderRadius: 3,
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }}>
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
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'white'
                      }
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
                      sx={{
                        bgcolor: 'white'
                      }}
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
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      fontWeight: 600,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5568d3 0%, #6a4091 100%)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)'
                      },
                      transition: 'all 0.3s ease'
                    }}
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
                      sx={{
                        borderColor: '#667eea',
                        color: '#667eea',
                        fontWeight: 600,
                        '&:hover': {
                          borderColor: '#5568d3',
                          bgcolor: 'rgba(102, 126, 234, 0.05)',
                          transform: 'translateY(-2px)'
                        },
                        transition: 'all 0.3s ease'
                      }}
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
            <Box sx={{
              mb: 3,
              display: 'flex',
              gap: 1,
              flexWrap: 'wrap',
              alignItems: 'center',
              p: 2,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}>
              <Typography variant="body2" sx={{ color: '#667eea', fontWeight: 600 }}>
                Filtering by:
              </Typography>
              {tagFilter && (
                <Chip
                  label={`Tag: ${tags.find(t => t.slug === tagFilter)?.name || tagFilter}`}
                  onDelete={() => handleTagChange('')}
                  sx={{
                    bgcolor: '#667eea',
                    color: 'white',
                    fontWeight: 600,
                    '& .MuiChip-deleteIcon': {
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&:hover': {
                        color: 'white'
                      }
                    }
                  }}
                />
              )}
              {categoryFilter && (
                <Chip
                  label={`Category: ${categories.find(c => c.slug === categoryFilter)?.name || categoryFilter}`}
                  onDelete={handleCategoryChange}
                  sx={{
                    bgcolor: '#764ba2',
                    color: 'white',
                    fontWeight: 600,
                    '& .MuiChip-deleteIcon': {
                      color: 'rgba(255, 255, 255, 0.7)',
                      '&:hover': {
                        color: 'white'
                      }
                    }
                  }}
                />
              )}
            </Box>
          )}

          {/* Loading State */}
          {loading ? (
            <Box sx={{
              display: 'flex',
              justifyContent: 'center',
              py: 8,
              minHeight: '400px',
              alignItems: 'center'
            }}>
              <CircularProgress size={60} sx={{ color: 'white' }} />
            </Box>
          ) : posts.length === 0 ? (
            /* Empty State */
            <Box sx={{
              textAlign: 'center',
              py: 8,
              px: 3,
              borderRadius: 3,
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#667eea' }}>
                No posts found
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', mt: 2 }}>
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
                        borderRadius: 3,
                        overflow: 'hidden',
                        transition: 'all 0.3s ease',
                        background: 'linear-gradient(to bottom, rgba(255,255,255,0.98), rgba(255,255,255,1))',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.8)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        '&:hover': {
                          transform: 'translateY(-12px)',
                          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                          '& .blog-card-image': {
                            transform: 'scale(1.05)'
                          }
                        }
                      }}
                    >
                      {post.coverImage && (
                        <Box sx={{
                          position: 'relative',
                          overflow: 'hidden',
                          height: 240,
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        }}>
                          <CardMedia
                            component="img"
                            image={post.coverImage}
                            alt={post.title}
                            className="blog-card-image"
                            sx={{
                              height: '100%',
                              objectFit: 'cover',
                              transition: 'transform 0.3s ease'
                            }}
                          />
                        </Box>
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
                                  fontWeight: 600,
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                  '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                  },
                                  transition: 'all 0.2s ease'
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
                          sx={{
                            mt: 2,
                            alignSelf: 'flex-start',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #5568d3 0%, #6a4091 100%)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                              transform: 'translateX(4px)'
                            },
                            transition: 'all 0.3s ease'
                          }}
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
                <Box sx={{
                  mt: 6,
                  display: 'flex',
                  justifyContent: 'center',
                  p: 3,
                  borderRadius: 3,
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}>
                  <Pagination
                    count={pagination.totalPages}
                    page={pagination.page}
                    onChange={handlePageChange}
                    size="large"
                    showFirstButton
                    showLastButton
                    sx={{
                      '& .MuiPaginationItem-root': {
                        fontWeight: 600,
                        '&.Mui-selected': {
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #5568d3 0%, #6a4091 100%)'
                          }
                        },
                        '&:hover': {
                          bgcolor: 'rgba(102, 126, 234, 0.1)'
                        }
                      }
                    }}
                  />
                </Box>
              )}
            </>
          )}
        </Container>
      </Box>
    </>
  );
};

export default BlogPage;
