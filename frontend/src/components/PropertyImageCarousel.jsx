import { useEffect, useMemo, useState } from 'react';
import { Box, IconButton } from '@mui/material';
import { ArrowBackIos, ArrowForwardIos } from '@mui/icons-material';
import { buildPropertyPlaceholder, resolvePropertyImageUrl } from '../utils/propertyImages.js';

const normalizeImages = (images) => {
  if (!Array.isArray(images)) return [];
  return images.filter((image) => typeof image === 'string' && image.trim().length > 0);
};

const defaultDotsSx = {
  display: 'flex',
  gap: 0.5,
};

const defaultDotSx = (isActive) => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  backgroundColor: isActive ? 'primary.main' : 'grey.300',
  cursor: 'pointer',
  transition: 'background-color 0.3s, transform 0.2s',
  '&:hover': {
    backgroundColor: isActive ? 'primary.dark' : 'grey.400',
    transform: 'scale(1.1)',
  },
});

const defaultArrowSx = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  backgroundColor: 'rgba(255,255,255,0.85)',
  '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)' },
  zIndex: 2,
};

const defaultImageSx = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
};

const PropertyImageCarousel = ({
  images,
  fallbackText,
  height = 200,
  placeholderSize = '600x320',
  autoplayInterval = 4000,
  showDots = true,
  showArrows = true,
  borderRadius = 2,
  imageSx,
  containerSx,
}) => {
  const items = useMemo(() => normalizeImages(images), [images]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [items]);

  useEffect(() => {
    if (!autoplayInterval || items.length <= 1) return undefined;

    const intervalId = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, autoplayInterval);

    return () => clearInterval(intervalId);
  }, [items, autoplayInterval]);

  const handleStep = (direction) => {
    setCurrentIndex((prev) => {
      if (items.length === 0) return 0;
      return (prev + direction + items.length) % items.length;
    });
  };

  const handleDotClick = (index) => {
    setCurrentIndex(index);
  };

  const currentImage = items.length > 0
    ? resolvePropertyImageUrl(items[currentIndex], fallbackText, placeholderSize)
    : buildPropertyPlaceholder(fallbackText, placeholderSize);

  return (
    <Box
      sx={{
        position: 'relative',
        height,
        borderRadius,
        overflow: 'hidden',
        ...containerSx,
      }}
    >
      <Box
        component="img"
        src={currentImage}
        alt={fallbackText || 'Property image'}
        sx={{ ...defaultImageSx, ...imageSx }}
      />

      {showArrows && items.length > 1 && (
        <>
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              handleStep(-1);
            }}
            sx={{ ...defaultArrowSx, left: 8 }}
            aria-label="Previous image"
          >
            <ArrowBackIos fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              handleStep(1);
            }}
            sx={{ ...defaultArrowSx, right: 8 }}
            aria-label="Next image"
          >
            <ArrowForwardIos fontSize="small" />
          </IconButton>
        </>
      )}

      {showDots && items.length > 1 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            ...defaultDotsSx,
          }}
        >
          {items.map((_, index) => (
            <Box
              key={index}
              onClick={(event) => {
                event.stopPropagation();
                handleDotClick(index);
              }}
              sx={defaultDotSx(index === currentIndex)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default PropertyImageCarousel;

