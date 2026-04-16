export const cloudinaryConfig = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
};

// Helper for generating standard cloudinary transformations
export const getOptimizedImageUrl = (publicId: any, width = 800) => {
  if (!publicId) return '';
  // If it's already a full URL, just return it
  if (publicId.startsWith('http')) return publicId;
  
  return `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload/f_auto,q_auto,w_${width}/${publicId}`;
};
