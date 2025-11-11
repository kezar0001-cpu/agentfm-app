import { useState, useEffect } from 'react';
import { createPreview } from '../utils/imageCompression';

/**
 * Hook to generate and manage image previews
 * @param {File} file - Image file to preview
 * @returns {Object} Preview state
 */
export function useImagePreview(file) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const generatePreview = async () => {
      try {
        setLoading(true);
        setError(null);

        const previewUrl = await createPreview(file);

        if (!cancelled) {
          setPreview(previewUrl);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[useImagePreview] Failed to generate preview:', err);
          setError(err);
          setLoading(false);
        }
      }
    };

    generatePreview();

    return () => {
      cancelled = true;
      // Revoke object URL if needed
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [file]);

  return { preview, loading, error };
}
