'use client';

import { useRef, useState } from 'react';

type R2UploadWidgetProps = {
  onSuccess: (result: { info: { secure_url: string } }) => void;
  options?: any;
  children: (props: { open: () => void, isUploading: boolean }) => React.ReactNode;
};

export const R2UploadWidget = ({ onSuccess, children }: R2UploadWidgetProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const openInit = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      // 1. Get presigned URL
      const res = await fetch('/api/upload/r2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type })
      });
      if (!res.ok) throw new Error('Failed to get presigned URL');
      const { presignedUrl, publicUrl } = await res.json();

      // 2. Upload directly to R2
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        }
      });
      if (!uploadRes.ok) throw new Error('Failed to upload file to R2');

      // 3. Complete
      onSuccess({ info: { secure_url: publicUrl } });
    } catch (err) {
      console.error(err);
      alert('Upload failed. Please check credentials or permissions.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileChange} 
        accept="image/*,audio/*"
      />
      {children({ open: openInit, isUploading })}
    </>
  );
};
