
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  TextField,
  Avatar,
  Divider,
} from '@mui/material';
import {
  CalendarToday as CalendarTodayIcon,
  Place as PlaceIcon,
  Person as PersonIcon,
  Notes as NotesIcon,
  AttachFile as AttachFileIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  Comment as CommentIcon,
} from '@mui/icons-material';

const JobDetailModal = ({ job, open, onClose }) => {
  if (!job) {
    return null;
  }

  // Placeholder data
  const subtasks = [
    { id: 1, text: 'Purchase materials', completed: true },
    { id: 2, text: 'Schedule with tenant', completed: false },
    { id: 3, text: 'Complete post-job cleanup', completed: false },
  ];

  const activity = [
    { id: 1, user: 'John Doe', comment: 'Initial assessment complete.', timestamp: '2 hours ago' },
    { id: 2, user: 'Jane Smith', comment: 'Tenant has been contacted.', timestamp: '1 hour ago' },
  ];

  const attachments = [
    { id: 1, name: 'Invoice.pdf', url: '#' },
    { id: 2, name: 'Damage_Photo.jpg', url: '#' },
  ];

  return (
    <Dialog open={open && !!job} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5" component="span">
          {job.title}
        </Typography>
        <Chip
          label={job.status.replace('_', ' ')}
          color="primary"
          size="small"
          sx={{ ml: 2 }}
        />
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Left Column: Core Details */}
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Job Details
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PlaceIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body1">
                  {job.property?.name || 'N/A'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CalendarTodayIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body1">
                  {job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString() : 'Not Scheduled'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body1">
                  {job.assignedTo ? `${job.assignedTo.firstName} ${job.assignedTo.lastName}` : 'Unassigned'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 2 }}>
                <NotesIcon sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {job.description}
                </Typography>
              </Box>
            </Paper>

            {/* Subtasks */}
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                <CheckCircleOutlineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Subtasks
              </Typography>
              <List dense>
                {subtasks.map((task) => (
                  <ListItem key={task.id} disablePadding>
                    <ListItemIcon>
                      <Checkbox edge="start" checked={task.completed} tabIndex={-1} disableRipple />
                    </ListItemIcon>
                    <ListItemText primary={task.text} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* Right Column: Activity & Attachments */}
          <Grid item xs={12} md={6}>
            {/* Activity Feed */}
            <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                <CommentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Activity
              </Typography>
              <Box>
                {activity.map((item) => (
                  <Box key={item.id} sx={{ display: 'flex', mb: 2 }}>
                    <Avatar sx={{ width: 32, height: 32, mr: 1.5, bgcolor: 'primary.main' }}>
                      {item.user.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2">
                        <strong>{item.user}</strong>
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.comment}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.timestamp}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
              <Divider sx={{ my: 2 }} />
              <TextField
                fullWidth
                variant="outlined"
                label="Add a comment..."
                size="small"
              />
            </Paper>

            {/* Attachments */}
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                <AttachFileIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                File Attachments
              </Typography>
              <List dense>
                {attachments.map((file) => (
                  <ListItem key={file.id} component="a" href={file.url} target="_blank" button>
                    <ListItemIcon>
                      <AttachFileIcon />
                    </ListItemIcon>
                    <ListItemText primary={file.name} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default JobDetailModal;
