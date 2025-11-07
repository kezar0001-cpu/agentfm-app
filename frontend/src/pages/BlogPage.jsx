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
          bgcolor: '#fafafa',
          pt: 8,
          pb: 12
        }}
      >
        <Container maxWidth="lg">
          {/* Header */}
          <Box sx={{
            mb: 8,
            textAlign: 'center',
            pt: 6,
            pb: 4
          }}>
            <Typography variant="h1" component="h1" gutterBottom sx={{
              fontWeight: 700,
              fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
              color: '#1d1d1f',
              mb: 2,
              letterSpacing: '-0.02em'
            }}>
              Blog
            </Typography>
            <Typography variant="h5" sx={{
              maxWidth: 650,
              mx: 'auto',
              color: '#6e6e73',
              fontWeight: 400,
              fontSize: { xs: '1.1rem', md: '1.25rem' },
              lineHeight: 1.5
            }}>
              Insights, tips, and stories from the world of property management
            </Typography>
          </Box>

          {/* Filters */}
          <Box sx={{
            mb: 6,
            p: 3,
            borderRadius: 2,
            bgcolor: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: '1px solid #e5e5e7'
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
                          <SearchIcon sx={{ color: '#86868b' }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1.5,
                        '& fieldset': {
                          borderColor: '#d2d2d7'
                        },
                        '&:hover fieldset': {
                          borderColor: '#b91c1c'
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#b91c1c',
                          borderWidth: 2
                        }
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
                        borderRadius: 1.5,
                        '& fieldset': {
                          borderColor: '#d2d2d7'
                        },
                        '&:hover fieldset': {
                          borderColor: '#b91c1c'
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#b91c1c',
                          borderWidth: 2
                        }
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
                      bgcolor: '#b91c1c',
                      fontWeight: 600,
                      textTransform: 'none',
                      fontSize: '1rem',
                      py: 1.2,
                      borderRadius: 1.5,
                      boxShadow: 'none',
                      '&:hover': {
                        bgcolor: '#991b1b',
                        boxShadow: 'none'
                      }
                    }}
                  >
                    Search
                  </Button>
                </Grid>

                {hasActiveFilters && (
                  <Grid item xs={12} md={2}>
                    <Button
                      fullWidth
                      variant="text"
                      size="large"
                      onClick={clearFilters}
                      sx={{
                        color: '#b91c1c',
                        fontWeight: 600,
                        textTransform: 'none',
                        fontSize: '1rem',
                        py: 1.2,
                        '&:hover': {
                          bgcolor: 'rgba(185, 28, 28, 0.04)'
                        }
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
              mb: 4,
              display: 'flex',
              gap: 1.5,
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <Typography variant="body2" sx={{ color: '#86868b', fontWeight: 500 }}>
                Filtering by:
              </Typography>
              {tagFilter && (
                <Chip
                  label={tags.find(t => t.slug === tagFilter)?.name || tagFilter}
                  onDelete={() => handleTagChange('')}
                  sx={{
                    bgcolor: '#f5f5f7',
                    color: '#1d1d1f',
                    fontWeight: 500,
                    border: '1px solid #d2d2d7',
                    '& .MuiChip-deleteIcon': {
                      color: '#86868b',
                      '&:hover': {
                        color: '#b91c1c'
                      }
                    }
                  }}
                />
              )}
              {categoryFilter && (
                <Chip
                  label={categories.find(c => c.slug === categoryFilter)?.name || categoryFilter}
                  onDelete={handleCategoryChange}
                  sx={{
                    bgcolor: '#f5f5f7',
                    color: '#1d1d1f',
                    fontWeight: 500,
                    border: '1px solid #d2d2d7',
                    '& .MuiChip-deleteIcon': {
                      color: '#86868b',
                      '&:hover': {
                        color: '#b91c1c'
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
              py: 12,
              minHeight: '400px',
              alignItems: 'center'
            }}>
              <CircularProgress size={50} sx={{ color: '#b91c1c' }} />
            </Box>
          ) : posts.length === 0 ? (
            /* Empty State */
            <Box sx={{
              textAlign: 'center',
              py: 12,
              px: 3
            }}>
              <Typography variant="h3" gutterBottom sx={{ fontWeight: 600, color: '#1d1d1f', mb: 2 }}>
                No posts found
              </Typography>
              <Typography variant="body1" sx={{ color: '#86868b', fontSize: '1.1rem' }}>
                Try adjusting your filters or check back later for new content
              </Typography>
            </Box>
          ) : (
            <>
              {/* Blog Posts Grid */}
              <Grid container spacing={{ xs: 3, md: 4 }}>
                {posts.map((post) => (
                  <Grid item xs={12} sm={6} md={4} key={post.id}>
                    <Card
                      component={Link}
                      to={`/blog/${post.slug}`}
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 2,
                        overflow: 'hidden',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        bgcolor: 'white',
                        border: '1px solid #e5e5e7',
                        boxShadow: 'none',
                        textDecoration: 'none',
                        '&:hover': {
                          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                          transform: 'translateY(-4px)',
                          '& .blog-card-image': {
                            transform: 'scale(1.03)'
                          }
                        }
                      }}
                    >
                      {post.coverImage && (
                        <Box sx={{
                          position: 'relative',
                          overflow: 'hidden',
                          height: 220,
                          bgcolor: '#f5f5f7'
                        }}>
                          <CardMedia
                            component="img"
                            image={post.coverImage}
                            alt={post.title}
                            className="blog-card-image"
                            sx={{
                              height: '100%',
                              objectFit: 'cover',
                              transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                          />
                        </Box>
                      )}
                      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: { xs: 2.5, md: 3 } }}>
                        {/* Categories - Minimal */}
                        {post.categories && post.categories.length > 0 && (
                          <Box sx={{ mb: 1.5 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                color: '#b91c1c',
                                fontWeight: 600,
                                fontSize: '0.813rem',
                                letterSpacing: '0.02em',
                                textTransform: 'uppercase'
                              }}
                            >
                              {post.categories[0].category.name}
                            </Typography>
                          </Box>
                        )}

                        {/* Title - Clean and prominent */}
                        <Typography
                          variant="h6"
                          sx={{
                            color: '#1d1d1f',
                            fontWeight: 600,
                            fontSize: '1.25rem',
                            lineHeight: 1.3,
                            mb: 1.5,
                            mt: 0.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            letterSpacing: '-0.01em'
                          }}
                        >
                          {post.title}
                        </Typography>

                        {/* Excerpt */}
                        {post.excerpt && (
                          <Typography
                            variant="body2"
                            sx={{
                              mb: 3,
                              flexGrow: 1,
                              color: '#86868b',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              lineHeight: 1.6,
                              fontSize: '0.938rem'
                            }}
                          >
                            {post.excerpt}
                          </Typography>
                        )}

                        {/* Meta Info - Clean and minimal */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 'auto' }}>
                          <Typography variant="caption" sx={{ color: '#86868b', fontSize: '0.813rem' }}>
                            {post.publishedAt && format(new Date(post.publishedAt), 'MMM d, yyyy')}
                          </Typography>
                          {post.tags && post.tags.length > 0 && (
                            <>
                              <Box sx={{ width: 2, height: 2, borderRadius: '50%', bgcolor: '#d2d2d7' }} />
                              <Typography variant="caption" sx={{ color: '#86868b', fontSize: '0.813rem' }}>
                                {post.tags.length} {post.tags.length === 1 ? 'tag' : 'tags'}
                              </Typography>
                            </>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <Box sx={{
                  mt: 8,
                  display: 'flex',
                  justifyContent: 'center'
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
                        fontWeight: 500,
                        color: '#1d1d1f',
                        border: '1px solid #d2d2d7',
                        '&.Mui-selected': {
                          bgcolor: '#b91c1c',
                          color: 'white',
                          border: '1px solid #b91c1c',
                          '&:hover': {
                            bgcolor: '#991b1b',
                            border: '1px solid #991b1b'
                          }
                        },
                        '&:hover': {
                          bgcolor: '#f5f5f7',
                          border: '1px solid #86868b'
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
