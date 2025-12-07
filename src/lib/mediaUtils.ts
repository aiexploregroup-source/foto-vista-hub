// Media type utilities
export const isVideoFile = (file: File): boolean => {
  return file.type.startsWith('video/');
};

export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

export const isValidMediaFile = (file: File): boolean => {
  return isImageFile(file) || isVideoFile(file);
};

export const isVideoUrl = (url: string): boolean => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext));
};

export const getAcceptedMediaTypes = (): string => {
  return 'image/*,video/*';
};

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export const validateMediaFile = (file: File): { valid: boolean; error?: string } => {
  if (!isValidMediaFile(file)) {
    return { valid: false, error: 'Please select an image or video file' };
  }

  if (isImageFile(file) && file.size > MAX_IMAGE_SIZE) {
    return { valid: false, error: 'Image must be less than 10MB' };
  }

  if (isVideoFile(file) && file.size > MAX_VIDEO_SIZE) {
    return { valid: false, error: 'Video must be less than 50MB' };
  }

  return { valid: true };
};
