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
        bgcolor: 'background.default',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #b91c1c 0%, #f97316 100%)',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(185, 28, 28, 0.3), transparent 50%), radial-gradient(circle at 80% 80%, rgba(249, 115, 22, 0.2), transparent 50%)',
          pointerEvents: 'none'
        }
      }}>
        {/* Hero Section */}
        {post.coverImage && (
          <Box
            sx={{
              width: '100%',
              height: { xs: 400, sm: 500, md: 600, lg: 700 },
              backgroundImage: `url(${post.coverImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.9) 100%)'
              }
            }}
          />
        )}

        <Container maxWidth="md" sx={{ mt: post.coverImage ? -15 : 8, position: 'relative', zIndex: 1 }}>
          {/* Back Button */}
          <Button
            component={Link}
            to="/blog"
            startIcon={<ArrowBackIcon />}
            sx={{ mb: 3, color: post.coverImage ? 'white' : 'text.primary' }}
          >
            Back to Blog
          </Button>

          {/* Article Card */}
          <Card sx={{
            p: { xs: 3, md: 5 },
            mb: 6,
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.98), rgba(255,255,255,1))',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.8)'
          }}>
            {/* Categories */}
            {post.categories && post.categories.length > 0 && (
              <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {post.categories.map((pc) => (
                  <Chip
                    key={pc.category.id}
                    label={pc.category.name}
                    component={Link}
                    to={`/blog?category=${pc.category.slug}`}
                    clickable
                    sx={{
                      bgcolor: pc.category.color || 'primary.main',
                      color: 'white',
                      fontWeight: 600,
                      px: 0.5,
                      fontSize: '0.875rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      '&:hover': {
                        bgcolor: pc.category.color ? `${pc.category.color}dd` : 'primary.dark',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  />
                ))}
              </Box>
            )}

            {/* Title */}
            <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 800, mb: 3 }}>
              {post.title}
            </Typography>

            {/* Meta Information */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  {post.author?.firstName?.charAt(0) || 'A'}
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {authorName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Author
                  </Typography>
                </Box>
              </Box>

              {post.publishedAt && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CalendarTodayIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {format(new Date(post.publishedAt), 'MMMM d, yyyy')}
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <VisibilityIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {post.viewCount || 0} views
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 4 }} />

            {/* Excerpt */}
            {post.excerpt && (
              <Typography
                variant="h6"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 400,
                  lineHeight: 1.8,
                  mb: 4,
                  fontStyle: 'italic',
                  pl: 3,
                  borderLeft: '4px solid',
                  borderColor: 'primary.main'
                }}
              >
                {post.excerpt}
              </Typography>
            )}

            {/* Content */}
            <Box
              sx={{
                '& h1, & h2, & h3, & h4, & h5, & h6': {
                  fontWeight: 700,
                  mt: 4,
                  mb: 2,
                  lineHeight: 1.3
                },
                '& h2': { fontSize: '2rem' },
                '& h3': { fontSize: '1.5rem' },
                '& p': {
                  lineHeight: 1.8,
                  mb: 2,
                  fontSize: '1.1rem',
                  color: 'text.primary'
                },
                '& a': {
                  color: 'primary.main',
                  textDecoration: 'underline',
                  '&:hover': {
                    color: 'primary.dark'
                  }
                },
                '& img': {
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: 2,
                  my: 3
                },
                '& ul, & ol': {
                  pl: 3,
                  mb: 2,
                  '& li': {
                    mb: 1,
                    lineHeight: 1.8
                  }
                },
                '& code': {
                  bgcolor: 'grey.100',
                  p: 0.5,
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.9em'
                },
                '& pre': {
                  bgcolor: 'grey.900',
                  color: 'white',
                  p: 2,
                  borderRadius: 2,
                  overflow: 'auto',
                  mb: 2,
                  '& code': {
                    bgcolor: 'transparent',
                    p: 0,
                    color: 'inherit'
                  }
                },
                '& blockquote': {
                  borderLeft: '4px solid',
                  borderColor: 'primary.main',
                  pl: 3,
                  py: 1,
                  my: 3,
                  fontStyle: 'italic',
                  color: 'text.secondary'
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

            <Divider sx={{ mt: 4, mb: 3 }} />

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
                  Tags:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {post.tags.map((pt) => (
                    <Chip
                      key={pt.tag.id}
                      label={pt.tag.name}
                      component={Link}
                      to={`/blog?tag=${pt.tag.slug}`}
                      clickable
                      variant="outlined"
                      size="medium"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Card>

          {/* Call to Action */}
          <Card sx={{
            p: 4,
            textAlign: 'center',
            mb: 6,
            background: 'linear-gradient(135deg, #b91c1c 0%, #f97316 100%)',
            color: 'white',
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(185, 28, 28, 0.4)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1), transparent 50%)',
              pointerEvents: 'none'
            }
          }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, position: 'relative', zIndex: 1 }}>
              Ready to Transform Your Property Management?
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, opacity: 0.95, position: 'relative', zIndex: 1 }}>
              Join thousands of property managers who trust Buildstate FM
            </Typography>
            <Button
              component={Link}
              to="/signup"
              variant="contained"
              size="large"
              sx={{
                bgcolor: 'white',
                color: '#b91c1c',
                fontWeight: 700,
                px: 4,
                py: 1.5,
                position: 'relative',
                zIndex: 1,
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                '&:hover': {
                  bgcolor: 'grey.100',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.2)'
                },
                transition: 'all 0.3s ease'
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
