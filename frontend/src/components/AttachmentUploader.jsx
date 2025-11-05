
import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';

const AttachmentUploader = ({ pendingFiles, onFileChange, onUpload, isUploading }) => (
  <Card variant="outlined" sx={{ mb: 3 }}>
    <CardContent>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
        <Button
          component="label"
          variant="outlined"
          startIcon={<CloudUploadIcon />}
          disabled={isUploading}
        >
          Select Files
          <input
            type="file"
            hidden
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={onFileChange}
          />
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
          Upload inspection photos, videos, or documents. Each file is limited to 10MB.
        </Typography>
        <Button
          variant="contained"
          onClick={onUpload}
          disabled={!pendingFiles.length || isUploading}
        >
          {isUploading ? 'Uploading…' : `Upload ${pendingFiles.length || ''}`}
        </Button>
      </Stack>
    </CardContent>
  </Card>
);

export default AttachmentUploader;
