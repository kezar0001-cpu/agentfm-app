import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  AlertTitle,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
  AutoAwesome as AutoAwesomeIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import {
  getBlogAutomationStatus,
  triggerBlogAutomation,
  updateBlogAutomationSettings,
} from '../api/blog';
import toast from 'react-hot-toast';

function BlogAutomationTab() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await getBlogAutomationStatus();
      setStatus(response.data);
    } catch (error) {
      console.error('Error fetching automation status:', error);
      toast.error('Failed to load automation status');
    } finally {
      setLoading(false);
    }
  };

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await triggerBlogAutomation();
      toast.success('Blog generation started! Check back in a few moments.');
      // Refresh status after a delay
      setTimeout(() => {
        fetchStatus();
      }, 3000);
    } catch (error) {
      console.error('Error triggering automation:', error);
      toast.error(error.response?.data?.message || 'Failed to trigger blog generation');
    } finally {
      setTriggering(false);
    }
  };

  const handleToggle = async (enabled) => {
    setToggling(true);
    try {
      await updateBlogAutomationSettings({ enabled });
      toast.success(`Blog automation ${enabled ? 'enabled' : 'disabled'}`);
      setStatus({ ...status, isEnabled: enabled });
    } catch (error) {
      console.error('Error updating automation settings:', error);
      toast.error('Failed to update automation settings');
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!status) {
    return (
      <Alert severity="error">
        <AlertTitle>Error</AlertTitle>
        Failed to load automation status. Please try refreshing the page.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header Section */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AutoAwesomeIcon sx={{ fontSize: 40, color: 'white' }} />
            <Box>
              <Typography variant="h5" fontWeight={700} color="white">
                AI Blog Automation
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                Automated daily blog post generation powered by Claude AI
              </Typography>
            </Box>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={status.isEnabled}
                onChange={(e) => handleToggle(e.target.checked)}
                disabled={toggling}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#4caf50',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#4caf50',
                  },
                }}
              />
            }
            label={
              <Typography color="white" fontWeight={600}>
                {status.isEnabled ? 'Enabled' : 'Disabled'}
              </Typography>
            }
            labelPlacement="start"
          />
        </Box>
      </Paper>

      {/* Alert Messages */}
      {!status.isEnabled && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Automation Disabled</AlertTitle>
          Enable automation to start generating daily blog posts automatically. You can still manually trigger
          post generation below.
        </Alert>
      )}

      {/* Statistics Grid */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Total Posts
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {status.totalPosts}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Automated Posts
              </Typography>
              <Typography variant="h4" fontWeight={700}>
                {status.automatedPosts}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {status.automationRate}% of total
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Published
              </Typography>
              <Typography variant="h4" fontWeight={700} color="success.main">
                {status.publishedAutomated}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Drafts
              </Typography>
              <Typography variant="h4" fontWeight={700} color="warning.main">
                {status.draftAutomated}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Manual Trigger Section */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Manual Generation
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Generate a blog post immediately without waiting for the scheduled time.
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="large"
            startIcon={triggering ? <CircularProgress size={20} color="inherit" /> : <PlayIcon />}
            onClick={handleTrigger}
            disabled={triggering}
            sx={{
              textTransform: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6941a0 100%)',
              },
            }}
          >
            {triggering ? 'Generating...' : 'Generate Now'}
          </Button>
        </Box>
        {status.autoPublish ? (
          <Alert severity="success" icon={<CheckIcon />}>
            Auto-publish is enabled. New posts will be published immediately.
          </Alert>
        ) : (
          <Alert severity="info" icon={<SettingsIcon />}>
            Auto-publish is disabled. New posts will be saved as drafts for your review.
          </Alert>
        )}
      </Paper>

      {/* Recent Automated Posts */}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
          Recent Automated Posts
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {status.recentAutomated && status.recentAutomated.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Views</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Published</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {status.recentAutomated.map((post) => (
                  <TableRow key={post.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {post.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={post.status}
                        size="small"
                        color={post.status === 'PUBLISHED' ? 'success' : 'warning'}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TrendingUpIcon fontSize="small" color="action" />
                        <Typography variant="body2">{post.viewCount}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {format(new Date(post.createdAt), 'MMM d, yyyy')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {post.publishedAt ? (
                        <Typography variant="body2" color="text.secondary">
                          {format(new Date(post.publishedAt), 'MMM d, yyyy')}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Not published
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info">
            No automated posts yet. Enable automation or manually trigger generation to get started.
          </Alert>
        )}
      </Paper>

      {/* Configuration Info */}
      <Paper elevation={2} sx={{ p: 3, mt: 3, bgcolor: 'grey.50' }}>
        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
          Configuration
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Blog automation is configured via environment variables on your backend server. Contact your system
          administrator to adjust settings like schedule, industry focus, word count, or auto-publish behavior.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          For more information, see the BLOG_AUTOMATION_GUIDE.md in the backend folder.
        </Typography>
      </Paper>
    </Box>
  );
}

export default BlogAutomationTab;
