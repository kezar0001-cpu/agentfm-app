import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Grid,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Description as DescriptionIcon,
  PlayCircle as PlayCircleIcon,
  Save as SaveIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

function isImageAttachment(attachment) {
  return attachment.mimeType?.startsWith('image/');
}

function isVideoAttachment(attachment) {
  return attachment.mimeType?.startsWith('video/');
}

const AttachmentPreview = ({ attachment }) => {
  if (isImageAttachment(attachment)) {
    return (
      <CardMedia
        component="img"
        height="160"
        image={attachment.url}
        alt={attachment.name}
        sx={{ objectFit: 'cover' }}
      />
    );
  }

  if (isVideoAttachment(attachment)) {
    return (
      <Box sx={{ position: 'relative', height: 160, bgcolor: 'grey.900', color: 'common.white' }}>
        <PlayCircleIcon sx={{ fontSize: 48, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 160,
        bgcolor: 'grey.100',
      }}
    >
      <DescriptionIcon color="action" sx={{ fontSize: 48 }} />
    </Box>
  );
};

const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return 'Unknown size';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const defaultAnnotation = (attachment) => {
  if (attachment?.annotations && typeof attachment.annotations === 'object') {
    return attachment.annotations;
  }
  return { note: '' };
};

const InspectionAttachmentManager = ({ inspectionId, attachments = [], canEdit = false }) => {
  const queryClient = useQueryClient();
  const [pendingFiles, setPendingFiles] = useState([]);
  const [annotationDrafts, setAnnotationDrafts] = useState(() => {
    const entries = attachments.map((attachment) => [attachment.id, defaultAnnotation(attachment).note || '']);
    return Object.fromEntries(entries);
  });

  useEffect(() => {
    setAnnotationDrafts((prev) => {
      const next = { ...prev };
      attachments.forEach((attachment) => {
        if (!(attachment.id in next)) {
          next[attachment.id] = defaultAnnotation(attachment).note || '';
        }
      });
      Object.keys(next).forEach((key) => {
        if (!attachments.find((attachment) => attachment.id === key)) {
          delete next[key];
        }
      });
      return next;
    });
  }, [attachments]);

  const uploadMutation = useMutation({
    mutationFn: async (files) => {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      const uploadResponse = await apiClient.post('/uploads/multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const urls = uploadResponse.data?.urls || [];
      if (!urls.length) {
        throw new Error('Upload failed');
      }

      const payload = urls.map((url, index) => ({
        url,
        name: files[index].name,
        mimeType: files[index].type || 'application/octet-stream',
        size: files[index].size,
        annotations: { note: '' },
      }));

      await apiClient.post(`/inspections/${inspectionId}/attachments`, { attachments: payload });
    },
    onSuccess: () => {
      setPendingFiles([]);
      queryClient.invalidateQueries(['inspection', inspectionId]);
    },
  });

  const updateAnnotationMutation = useMutation({
    mutationFn: async ({ attachmentId, note }) => {
      await apiClient.patch(`/inspections/${inspectionId}/attachments/${attachmentId}`, {
        annotations: { note },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['inspection', inspectionId]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId) => {
      await apiClient.delete(`/inspections/${inspectionId}/attachments/${attachmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['inspection', inspectionId]);
    },
  });

  const handleFileChange = (event) => {
    if (!event.target.files) return;
    setPendingFiles(Array.from(event.target.files));
  };

  const handleUpload = () => {
    if (!pendingFiles.length) return;
    uploadMutation.mutate(pendingFiles);
  };

  const handleAnnotationChange = (attachmentId, value) => {
    setAnnotationDrafts((prev) => ({ ...prev, [attachmentId]: value }));
  };

  const handleAnnotationSave = (attachmentId) => {
    const note = annotationDrafts[attachmentId] ?? '';
    updateAnnotationMutation.mutate({ attachmentId, note });
  };

  const groupedAttachments = useMemo(() => {
    return attachments.reduce(
      (acc, attachment) => {
        if (isImageAttachment(attachment)) {
          acc.images.push(attachment);
        } else if (isVideoAttachment(attachment)) {
          acc.videos.push(attachment);
        } else {
          acc.documents.push(attachment);
        }
        return acc;
      },
      { images: [], videos: [], documents: [] },
    );
  }, [attachments]);

  return (
    <Box>
      {canEdit && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Button
                component="label"
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                disabled={uploadMutation.isPending}
              >
                Select Files
                <input
                  type="file"
                  hidden
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileChange}
                />
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                Upload inspection photos, videos, or documents. Each file is limited to 10MB.
              </Typography>
              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={!pendingFiles.length || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? 'Uploading…' : `Upload ${pendingFiles.length || ''}`}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {!attachments.length ? (
        <Typography variant="body2" color="text.secondary">
          No attachments uploaded yet.
        </Typography>
      ) : (
        <Stack spacing={3}>
          {groupedAttachments.images.length > 0 && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Photos
              </Typography>
              <Grid container spacing={2}>
                {groupedAttachments.images.map((attachment) => (
                  <Grid item xs={12} sm={6} md={4} key={attachment.id}>
                    <Card variant="outlined">
                      <AttachmentPreview attachment={attachment} />
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                          {attachment.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatFileSize(attachment.size)} • Uploaded{' '}
                          {attachment.createdAt ? new Date(attachment.createdAt).toLocaleString() : 'recently'}
                        </Typography>
                        <TextField
                          label="Annotation"
                          size="small"
                          margin="dense"
                          value={annotationDrafts[attachment.id] ?? defaultAnnotation(attachment).note ?? ''}
                          onChange={(event) => handleAnnotationChange(attachment.id, event.target.value)}
                          multiline
                          minRows={2}
                          fullWidth
                          disabled={!canEdit}
                        />
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'space-between' }}>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="Preview">
                            <IconButton component="a" href={attachment.url} target="_blank" rel="noopener">
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          {canEdit && (
                            <Tooltip title="Save annotation">
                              <span>
                                <IconButton
                                  onClick={() => handleAnnotationSave(attachment.id)}
                                  disabled={updateAnnotationMutation.isPending}
                                >
                                  <SaveIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                        </Stack>
                        {canEdit && (
                          <Tooltip title="Delete attachment">
                            <span>
                              <IconButton
                                color="error"
                                onClick={() => deleteMutation.mutate(attachment.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {groupedAttachments.videos.length > 0 && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Videos
              </Typography>
              <Grid container spacing={2}>
                {groupedAttachments.videos.map((attachment) => (
                  <Grid item xs={12} sm={6} key={attachment.id}>
                    <Card variant="outlined">
                      <AttachmentPreview attachment={attachment} />
                      <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                          {attachment.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatFileSize(attachment.size)}
                        </Typography>
                        <TextField
                          label="Annotation"
                          size="small"
                          margin="dense"
                          value={annotationDrafts[attachment.id] ?? defaultAnnotation(attachment).note ?? ''}
                          onChange={(event) => handleAnnotationChange(attachment.id, event.target.value)}
                          multiline
                          minRows={2}
                          fullWidth
                          disabled={!canEdit}
                        />
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'space-between' }}>
                        <IconButton component="a" href={attachment.url} target="_blank" rel="noopener">
                          <VisibilityIcon />
                        </IconButton>
                        {canEdit && (
                          <Stack direction="row" spacing={1}>
                            <IconButton
                              onClick={() => handleAnnotationSave(attachment.id)}
                              disabled={updateAnnotationMutation.isPending}
                            >
                              <SaveIcon />
                            </IconButton>
                            <IconButton
                              color="error"
                              onClick={() => deleteMutation.mutate(attachment.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Stack>
                        )}
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {groupedAttachments.documents.length > 0 && (
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Documents
              </Typography>
              <Stack spacing={1}>
                {groupedAttachments.documents.map((attachment) => (
                  <Card key={attachment.id} variant="outlined">
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <DescriptionIcon color="action" />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle2">{attachment.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(attachment.size)}
                          </Typography>
                        </Box>
                        <IconButton component="a" href={attachment.url} target="_blank" rel="noopener">
                          <VisibilityIcon />
                        </IconButton>
                        {canEdit && (
                          <IconButton
                            color="error"
                            onClick={() => deleteMutation.mutate(attachment.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Stack>
                      <TextField
                        label="Annotation"
                        size="small"
                        value={annotationDrafts[attachment.id] ?? defaultAnnotation(attachment).note ?? ''}
                        onChange={(event) => handleAnnotationChange(attachment.id, event.target.value)}
                        multiline
                        minRows={2}
                        fullWidth
                        disabled={!canEdit}
                      />
                      {canEdit && (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            size="small"
                            startIcon={<SaveIcon />}
                            onClick={() => handleAnnotationSave(attachment.id)}
                            disabled={updateAnnotationMutation.isPending}
                          >
                            Save Note
                          </Button>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default InspectionAttachmentManager;
