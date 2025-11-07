import { useCallback, useState } from 'react';
import { apiClient } from '../api/client.js';

const normalizeFilesInput = (files) => {
  if (!files) return [];
  if (Array.isArray(files)) return files;
  return Array.from(files);
};

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const uploadFiles = useCallback(async (filesLike) => {
    const files = normalizeFilesInput(filesLike).filter(Boolean);
    if (files.length === 0) {
      return [];
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      let endpoint = '/uploads/single';

      if (files.length === 1) {
        formData.append('file', files[0]);
      } else {
        endpoint = '/uploads/multiple';
        files.forEach((file) => {
          formData.append('files', file);
        });
      }

      const response = await apiClient.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = response?.data || {};
      if (files.length === 1) {
        if (!data.url) {
          throw new Error('Upload failed. No file URL was returned.');
        }
        return [data.url];
      }

      if (!Array.isArray(data.urls) || data.urls.length === 0) {
        throw new Error('Upload failed. No file URLs were returned.');
      }

      return data.urls;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const resetError = useCallback(() => setError(null), []);

  return {
    uploadFiles,
    isUploading,
    error,
    resetError,
  };
}

export default useFileUpload;
