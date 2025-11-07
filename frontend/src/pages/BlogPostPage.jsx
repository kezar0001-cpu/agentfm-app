import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Chip,
  Avatar,
  Divider,
  CircularProgress,
  Button,
  Card,
  CardContent
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonIcon from '@mui/icons-material/Person';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { format } from 'date-fns';
import { getBlogPost } from '../api/blog';
import SEO from '../components/SEO';
import BlogPublicNav from '../components/BlogPublicNav';
import toast from 'react-hot-toast';

const BlogPostPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPost();
  }, [slug]);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const response = await getBlogPost(slug);
      setPost(response.data);
    } catch (error) {
      console.error('Error fetching blog post:', error);
      if (error.response?.status === 404) {
        toast.error('Blog post not found');
        navigate('/blog');
      } else {
        toast.error('Failed to load blog post');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!post) {
    return null;
  }

  const authorName = `${post.author?.firstName || ''} ${post.author?.lastName || ''}`.trim();

  return (
    <>
      <SEO
        title={post.metaTitle || post.title}
        description={post.metaDescription || post.excerpt}
        keywords={post.metaKeywords || []}
        image={post.ogImage || post.coverImage}
        url={`${window.location.origin}/blog/${post.slug}`}
        type="article"
        article={true}
        author={authorName}
        publishedDate={post.publishedAt}
        modifiedDate={post.updatedAt}
        tags={post.tags?.map(pt => pt.tag.name) || []}
      />

      <BlogPublicNav />

      <Box sx={{
        bgcolor: '#fafafa',
        minHeight: '100vh',
        pb: 8
      }}>
        {/* Hero Section */}
        {post.coverImage && (
          <Box
            sx={{
              width: '100%',
              height: { xs: 400, sm: 500, md: 550 },
              backgroundImage: `url(${post.coverImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
              bgcolor: '#f5f5f7'
            }}
          />
        )}

        <Container maxWidth="md" sx={{ mt: post.coverImage ? -12 : 8, position: 'relative', zIndex: 1 }}>
          {/* Back Button */}
          <Button
            component={Link}
            to="/blog"
            startIcon={<ArrowBackIcon />}
            sx={{
              mb: 3,
              color: post.coverImage ? 'white' : '#1d1d1f',
              fontWeight: 500,
              textTransform: 'none',
              fontSize: '1rem',
              '&:hover': {
                bgcolor: post.coverImage ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)'
              }
            }}
          >
            Back to Blog
          </Button>

          {/* Article Card */}
          <Card sx={{
            p: { xs: 3, md: 6 },
            mb: 6,
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            bgcolor: 'white',
            border: '1px solid #e5e5e7'
          }}>
            {/* Categories */}
            {post.categories && post.categories.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#b91c1c',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase'
                  }}
                >
                  {post.categories[0].category.name}
                </Typography>
              </Box>
            )}

            {/* Title */}
            <Typography
              variant="h1"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 700,
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                lineHeight: 1.1,
                color: '#1d1d1f',
                mb: 3,
                letterSpacing: '-0.02em'
              }}
            >
              {post.title}
            </Typography>

            {/* Meta Information */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4, flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ color: '#1d1d1f', fontWeight: 500 }}>
                {authorName}
              </Typography>
              <Box sx={{ width: 2, height: 2, borderRadius: '50%', bgcolor: '#d2d2d7' }} />
              {post.publishedAt && (
                <Typography variant="body2" sx={{ color: '#86868b' }}>
                  {format(new Date(post.publishedAt), 'MMMM d, yyyy')}
                </Typography>
              )}
              <Box sx={{ width: 2, height: 2, borderRadius: '50%', bgcolor: '#d2d2d7' }} />
              <Typography variant="body2" sx={{ color: '#86868b' }}>
                {post.viewCount || 0} views
              </Typography>
            </Box>

            <Divider sx={{ mb: 5, borderColor: '#e5e5e7' }} />

            {/* Excerpt */}
            {post.excerpt && (
              <Typography
                variant="h6"
                sx={{
                  color: '#6e6e73',
                  fontWeight: 400,
                  fontSize: '1.25rem',
                  lineHeight: 1.6,
                  mb: 5,
                  letterSpacing: '-0.01em'
                }}
              >
                {post.excerpt}
              </Typography>
            )}

            {/* Content */}
            <Box
              sx={{
                '& h1, & h2, & h3, & h4, & h5, & h6': {
                  fontWeight: 600,
                  mt: 5,
                  mb: 2.5,
                  lineHeight: 1.3,
                  color: '#1d1d1f',
                  letterSpacing: '-0.01em'
                },
                '& h2': { fontSize: '2rem', mt: 6 },
                '& h3': { fontSize: '1.5rem' },
                '& p': {
                  lineHeight: 1.7,
                  mb: 2.5,
                  fontSize: '1.125rem',
                  color: '#1d1d1f',
                  letterSpacing: '-0.005em'
                },
                '& a': {
                  color: '#b91c1c',
                  textDecoration: 'none',
                  fontWeight: 500,
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                },
                '& img': {
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: 1.5,
                  my: 4
                },
                '& ul, & ol': {
                  pl: 3,
                  mb: 3,
                  '& li': {
                    mb: 1.5,
                    lineHeight: 1.7,
                    fontSize: '1.125rem',
                    color: '#1d1d1f'
                  }
                },
                '& code': {
                  bgcolor: '#f5f5f7',
                  color: '#1d1d1f',
                  p: 0.5,
                  px: 1,
                  borderRadius: 0.5,
                  fontFamily: 'monospace',
                  fontSize: '0.9em',
                  fontWeight: 500
                },
                '& pre': {
                  bgcolor: '#1d1d1f',
                  color: '#f5f5f7',
                  p: 3,
                  borderRadius: 1.5,
                  overflow: 'auto',
                  mb: 3,
                  '& code': {
                    bgcolor: 'transparent',
                    p: 0,
                    color: 'inherit'
                  }
                },
                '& blockquote': {
                  borderLeft: '3px solid #b91c1c',
                  pl: 3,
                  py: 0.5,
                  my: 4,
                  fontStyle: 'normal',
                  color: '#6e6e73',
                  fontSize: '1.125rem'
                }
              }}
              dangerouslySetInnerHTML={{ __html: post.htmlContent || post.content }}
            />

            {/* Media Gallery */}
            {post.media && post.media.length > 0 && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>
                  Media
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  {post.media.map((media) => (
                    <Box key={media.id}>
                      {media.type === 'IMAGE' && (
                        <Box>
                          <img
                            src={media.url}
                            alt={media.altText || media.caption}
                            style={{
                              width: '100%',
                              height: 'auto',
                              borderRadius: 8
                            }}
                          />
                          {media.caption && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                              {media.caption}
                            </Typography>
                          )}
                        </Box>
                      )}
                      {media.type === 'VIDEO' && (
                        <Box>
                          <video
                            src={media.url}
                            controls
                            style={{
                              width: '100%',
                              height: 'auto',
                              borderRadius: 8
                            }}
                          />
                          {media.caption && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                              {media.caption}
                            </Typography>
                          )}
                        </Box>
                      )}
                      {media.type === 'EMBED' && (
                        <Box
                          dangerouslySetInnerHTML={{ __html: media.url }}
                          sx={{ borderRadius: 2, overflow: 'hidden' }}
                        />
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            <Divider sx={{ mt: 6, mb: 4, borderColor: '#e5e5e7' }} />

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <Box>
                <Typography variant="body2" sx={{ mb: 2, fontWeight: 500, color: '#86868b' }}>
                  Tagged with:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  {post.tags.map((pt) => (
                    <Chip
                      key={pt.tag.id}
                      label={pt.tag.name}
                      component={Link}
                      to={`/blog?tag=${pt.tag.slug}`}
                      clickable
                      size="medium"
                      sx={{
                        bgcolor: '#f5f5f7',
                        color: '#1d1d1f',
                        border: '1px solid #d2d2d7',
                        fontWeight: 500,
                        '&:hover': {
                          bgcolor: '#e8e8ed',
                          borderColor: '#b91c1c'
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Card>

          {/* Call to Action */}
          <Card sx={{
            p: { xs: 4, md: 5 },
            textAlign: 'center',
            mb: 6,
            bgcolor: '#1d1d1f',
            color: 'white',
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            border: 'none'
          }}>
            <Typography
              variant="h4"
              gutterBottom
              sx={{
                fontWeight: 600,
                fontSize: { xs: '1.75rem', md: '2rem' },
                mb: 2,
                letterSpacing: '-0.01em'
              }}
            >
              Ready to Transform Your Property Management?
            </Typography>
            <Typography variant="body1" sx={{ mb: 4, color: '#f5f5f7', fontSize: '1.125rem', maxWidth: 500, mx: 'auto' }}>
              Join thousands of property managers who trust Buildstate FM
            </Typography>
            <Button
              component={Link}
              to="/signup"
              variant="contained"
              size="large"
              sx={{
                bgcolor: '#b91c1c',
                color: 'white',
                fontWeight: 600,
                textTransform: 'none',
                px: 4,
                py: 1.5,
                fontSize: '1rem',
                borderRadius: 1.5,
                boxShadow: 'none',
                '&:hover': {
                  bgcolor: '#991b1b',
                  boxShadow: 'none'
                }
              }}
            >
              Get Started Free
            </Button>
          </Card>
        </Container>
      </Box>
    </>
  );
};

export default BlogPostPage;
