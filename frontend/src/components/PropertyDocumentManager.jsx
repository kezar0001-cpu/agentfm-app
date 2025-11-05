import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Description as DescriptionIcon,
  CloudUpload as CloudUploadIcon,
  Close as CloseIcon,
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Article as ArticleIcon,
} from '@mui/icons-material';
import {
  usePropertyDocuments,
  useAddPropertyDocument,
  useDeletePropertyDocument,
} from '../hooks/usePropertyDocuments.js';
import { useNotification } from '../hooks/useNotification.js';
import { DOCUMENT_CATEGORIES, DOCUMENT_ACCESS_LEVELS } from '../schemas/propertySchema.js';

const getDocumentIcon = (mimeType) => {
  if (mimeType.includes('pdf')) return <PdfIcon />;
  if (mimeType.includes('image')) return <ImageIcon />;
  if (mimeType.includes('text')) return <ArticleIcon />;
  return <FileIcon />;
};

const getAccessLevelColor = (level) => {
  switch (level) {
    case 'PUBLIC':
      return 'success';
    case 'TENANT':
      return 'info';
    case 'OWNER':
      return 'warning';
    case 'PROPERTY_MANAGER':
      return 'error';
    default:
      return 'default';
  }
};

const PropertyDocumentManager = ({ propertyId, canEdit = false }) => {
  const { showSuccess, showError } = useNotification();
  const { data: documentsData, isLoading, refetch } = usePropertyDocuments(propertyId);
  const addDocumentMutation = useAddPropertyDocument(propertyId, () => {
    showSuccess('Document added successfully');
    refetch();
  });
  const deleteDocumentMutation = useDeletePropertyDocument(propertyId, () => {
    showSuccess('Document deleted successfully');
    refetch();
  });

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [formData, setFormData] = useState({
    fileName: '',
    fileUrl: '',
    fileSize: 0,
    mimeType: '',
    category: 'OTHER',
    description: '',
    accessLevel: 'PROPERTY_MANAGER',
  });
  const [uploadError, setUploadError] = useState('');

  const documents = documentsData?.documents || [];

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddDocument = async () => {
    if (!formData.fileName.trim() || !formData.fileUrl.trim()) {
      setUploadError('File name and URL are required');
      return;
    }

    try {
      setUploadError('');
      await addDocumentMutation.mutateAsync({
        data: {
          fileName: formData.fileName.trim(),
          fileUrl: formData.fileUrl.trim(),
          fileSize: formData.fileSize || 0,
          mimeType: formData.mimeType || 'application/octet-stream',
          category: formData.category,
          description: formData.description.trim() || null,
          accessLevel: formData.accessLevel,
        },
      });
      setUploadDialogOpen(false);
      setFormData({
        fileName: '',
        fileUrl: '',
        fileSize: 0,
        mimeType: '',
        category: 'OTHER',
        description: '',
        accessLevel: 'PROPERTY_MANAGER',
      });
    } catch (error) {
      setUploadError(error.response?.data?.message || 'Failed to add document');
    }
  };

  const handleDeleteDocument = async () => {
    if (!selectedDocument) return;

    try {
      await deleteDocumentMutation.mutateAsync({
        url: `/properties/${propertyId}/documents/${selectedDocument.id}`,
      });
      setDeleteDialogOpen(false);
      setSelectedDocument(null);
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to delete document');
    }
  };

  const handleDownload = (document) => {
    window.open(document.fileUrl, '_blank');
  };

  const openDeleteDialog = (document) => {
    setSelectedDocument(document);
    setDeleteDialogOpen(true);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getCategoryLabel = (value) => {
    const category = DOCUMENT_CATEGORIES.find((cat) => cat.value === value);
    return category ? category.label : value;
  };

  const getAccessLevelLabel = (value) => {
    const level = DOCUMENT_ACCESS_LEVELS.find((lvl) => lvl.value === value);
    return level ? level.label : value;
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {canEdit && (
        <Box mb={2}>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Add Document
          </Button>
        </Box>
      )}

      {documents.length === 0 ? (
        <Alert severity="info">No documents uploaded yet</Alert>
      ) : (
        <List>
          {documents.map((document) => (
            <ListItem
              key={document.id}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1,
              }}
            >
              <ListItemIcon>{getDocumentIcon(document.mimeType)}</ListItemIcon>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body1">{document.fileName}</Typography>
                    <Chip
                      label={getCategoryLabel(document.category)}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={getAccessLevelLabel(document.accessLevel)}
                      size="small"
                      color={getAccessLevelColor(document.accessLevel)}
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    {document.description && (
                      <Typography variant="body2" color="text.secondary">
                        {document.description}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(document.fileSize)} • Uploaded by{' '}
                      {document.uploader?.firstName} {document.uploader?.lastName} •{' '}
                      {new Date(document.uploadedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={() => handleDownload(document)}
                  title="Download"
                >
                  <DownloadIcon />
                </IconButton>
                {canEdit && (
                  <IconButton
                    edge="end"
                    onClick={() => openDeleteDialog(document)}
                    color="error"
                    title="Delete"
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Add Property Document
          <IconButton
            onClick={() => setUploadDialogOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {uploadError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {uploadError}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="File Name"
            type="text"
            fullWidth
            value={formData.fileName}
            onChange={(e) => handleFormChange('fileName', e.target.value)}
            required
          />
          <TextField
            margin="dense"
            label="File URL"
            type="url"
            fullWidth
            value={formData.fileUrl}
            onChange={(e) => handleFormChange('fileUrl', e.target.value)}
            helperText="Upload files via the Uploads page first, then paste the URL here"
            required
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category}
              onChange={(e) => handleFormChange('category', e.target.value)}
              label="Category"
            >
              {DOCUMENT_CATEGORIES.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Access Level</InputLabel>
            <Select
              value={formData.accessLevel}
              onChange={(e) => handleFormChange('accessLevel', e.target.value)}
              label="Access Level"
            >
              {DOCUMENT_ACCESS_LEVELS.map((level) => (
                <MenuItem key={level.value} value={level.value}>
                  {level.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Description (Optional)"
            type="text"
            fullWidth
            multiline
            rows={2}
            value={formData.description}
            onChange={(e) => handleFormChange('description', e.target.value)}
          />
          <TextField
            margin="dense"
            label="File Size (bytes)"
            type="number"
            fullWidth
            value={formData.fileSize}
            onChange={(e) => handleFormChange('fileSize', parseInt(e.target.value) || 0)}
          />
          <TextField
            margin="dense"
            label="MIME Type"
            type="text"
            fullWidth
            value={formData.mimeType}
            onChange={(e) => handleFormChange('mimeType', e.target.value)}
            helperText="e.g., application/pdf, image/jpeg"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddDocument}
            variant="contained"
            disabled={addDocumentMutation.isPending}
          >
            {addDocumentMutation.isPending ? 'Adding...' : 'Add Document'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Document</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedDocument?.fileName}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteDocument}
            color="error"
            variant="contained"
            disabled={deleteDocumentMutation.isPending}
          >
            {deleteDocumentMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PropertyDocumentManager;
