import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  FormControlLabel,
  Switch,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import { Save as SaveIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import {
  getAdminBlogPost,
  createBlogPost,
  updateBlogPost,
  getBlogCategories,
  getBlogTags,
} from '../../api/blog';
import toast from 'react-hot-toast';

function BlogPostEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = id && id !== 'new';

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    htmlContent: '',
    coverImage: '',
    status: 'DRAFT',
    featured: false,
    metaTitle: '',
    metaDescription: '',
    metaKeywords: [],
    ogImage: '',
    categoryIds: [],
    tagIds: [],
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [categoriesRes, tagsRes] = await Promise.all([
        getBlogCategories(),
        getBlogTags(),
      ]);
      setCategories(categoriesRes.data);
      setTags(tagsRes.data);

      if (isEditMode) {
        const postRes = await getAdminBlogPost(id);
        const post = postRes.data;
        setFormData({
          title: post.title || '',
          slug: post.slug || '',
          excerpt: post.excerpt || '',
          content: post.content || '',
          htmlContent: post.htmlContent || '',
          coverImage: post.coverImage || '',
          status: post.status || 'DRAFT',
          featured: post.featured || false,
          metaTitle: post.metaTitle || '',
          metaDescription: post.metaDescription || '',
          metaKeywords: post.metaKeywords || [],
          ogImage: post.ogImage || '',
          categoryIds: post.categories?.map((pc) => pc.category.id) || [],
          tagIds: post.tags?.map((pt) => pt.tag.id) || [],
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Auto-generate slug from title if creating new post
    if (field === 'title' && !isEditMode) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData((prev) => ({ ...prev, slug }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        // Convert htmlContent from content if not provided (simple conversion)
        htmlContent: formData.htmlContent || formData.content.replace(/\n/g, '<br/>'),
      };

      if (isEditMode) {
        await updateBlogPost(id, payload);
        toast.success('Post updated successfully');
      } else {
        await createBlogPost(payload);
        toast.success('Post created successfully');
      }
      navigate('/admin/blog');
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error(error.response?.data?.message || 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/admin/blog')}
          sx={{ textTransform: 'none' }}
        >
          Back to Posts
        </Button>
        <Typography variant="h4" component="h1" fontWeight={700}>
          {isEditMode ? 'Edit Post' : 'Create New Post'}
        </Typography>
      </Box>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Main Content */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Content
              </Typography>

              <TextField
                fullWidth
                label="Title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                required
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Slug"
                value={formData.slug}
                onChange={(e) => handleChange('slug', e.target.value)}
                required
                helperText="URL-friendly version of the title"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Excerpt"
                value={formData.excerpt}
                onChange={(e) => handleChange('excerpt', e.target.value)}
                multiline
                rows={2}
                helperText="Short summary for post listings"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Content"
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                multiline
                rows={12}
                required
                helperText="Markdown or plain text content"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="HTML Content (Optional)"
                value={formData.htmlContent}
                onChange={(e) => handleChange('htmlContent', e.target.value)}
                multiline
                rows={8}
                helperText="Rendered HTML version of content (auto-generated if not provided)"
              />
            </Paper>

            <Paper sx={{ p: 3, mt: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                SEO & Meta
              </Typography>

              <TextField
                fullWidth
                label="Meta Title"
                value={formData.metaTitle}
                onChange={(e) => handleChange('metaTitle', e.target.value)}
                helperText="SEO title (defaults to post title)"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Meta Description"
                value={formData.metaDescription}
                onChange={(e) => handleChange('metaDescription', e.target.value)}
                multiline
                rows={2}
                helperText="SEO description for search engines"
                sx={{ mb: 2 }}
              />

              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={formData.metaKeywords}
                onChange={(e, newValue) => handleChange('metaKeywords', newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Meta Keywords"
                    helperText="Press Enter to add keywords"
                  />
                )}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="OG Image URL"
                value={formData.ogImage}
                onChange={(e) => handleChange('ogImage', e.target.value)}
                helperText="Open Graph image for social media sharing"
              />
            </Paper>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Publish Settings
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  <MenuItem value="DRAFT">Draft</MenuItem>
                  <MenuItem value="PUBLISHED">Published</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.featured}
                    onChange={(e) => handleChange('featured', e.target.checked)}
                  />
                }
                label="Featured Post"
                sx={{ mb: 2 }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                disabled={saving}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                {saving ? 'Saving...' : isEditMode ? 'Update Post' : 'Create Post'}
              </Button>
            </Paper>

            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Featured Image
              </Typography>

              <TextField
                fullWidth
                label="Cover Image URL"
                value={formData.coverImage}
                onChange={(e) => handleChange('coverImage', e.target.value)}
                helperText="URL to the cover image"
              />

              {formData.coverImage && (
                <Box
                  component="img"
                  src={formData.coverImage}
                  alt="Cover preview"
                  sx={{
                    width: '100%',
                    height: 'auto',
                    mt: 2,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}
            </Paper>

            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Categories
              </Typography>

              <FormControl fullWidth>
                <InputLabel>Select Categories</InputLabel>
                <Select
                  multiple
                  value={formData.categoryIds}
                  onChange={(e) => handleChange('categoryIds', e.target.value)}
                  input={<OutlinedInput label="Select Categories" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const cat = categories.find((c) => c.id === value);
                        return (
                          <Chip
                            key={value}
                            label={cat?.name}
                            size="small"
                            sx={{
                              bgcolor: cat?.color || 'primary.main',
                              color: 'white',
                            }}
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight={600}>
                Tags
              </Typography>

              <FormControl fullWidth>
                <InputLabel>Select Tags</InputLabel>
                <Select
                  multiple
                  value={formData.tagIds}
                  onChange={(e) => handleChange('tagIds', e.target.value)}
                  input={<OutlinedInput label="Select Tags" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const tag = tags.find((t) => t.id === value);
                        return <Chip key={value} label={tag?.name} size="small" variant="outlined" />;
                      })}
                    </Box>
                  )}
                >
                  {tags.map((tag) => (
                    <MenuItem key={tag.id} value={tag.id}>
                      {tag.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Paper>
          </Grid>
        </Grid>
      </form>
    </Container>
  );
}

export default BlogPostEditorPage;
