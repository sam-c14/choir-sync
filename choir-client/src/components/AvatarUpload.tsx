import React, { useRef, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { toast } from 'sonner';

interface AvatarUploadProps {
  currentUrl?: string | null;
  name?: string | null;
  onUploadSuccess: (url: string | null) => void;
}

export function AvatarUpload({ currentUrl, name, onUploadSuccess }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 500,
        useWebWorker: true,
        fileType: 'image/webp' as any
      };
      
      const compressedFile = await imageCompression(file, options);
      
      const res = await apiClient.post('/users/upload-avatar-url', {
        filename: compressedFile.name.replace(/\.[^/.]+$/, "") + ".webp"
      });
      
      const { signedUrl, publicUrl } = res.data;
      
      await fetch(signedUrl, {
        method: 'PUT',
        body: compressedFile,
        headers: {
          'Content-Type': 'image/webp'
        }
      });
      
      await apiClient.patch('/users/me', { avatarUrl: publicUrl });
      onUploadSuccess(publicUrl);
      toast.success('Avatar updated successfully');
    } catch (error: any) {
      console.error(error);
      toast.error('Failed to upload avatar');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsUploading(true);
      await apiClient.patch('/users/me', { avatarUrl: null });
      onUploadSuccess(null);
      toast.success('Avatar removed successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to remove avatar');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <div 
        className="relative group cursor-pointer inline-block" 
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-primary/20">
          {currentUrl ? (
            <img src={currentUrl} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl font-bold text-muted-foreground">
              {getInitials(name)}
            </span>
          )}
        </div>
        
        <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {isUploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
          disabled={isUploading}
        />
      </div>

      {currentUrl && !isUploading && (
        <button
          type="button"
          onClick={handleDelete}
          className="absolute bottom-0 right-0 p-2 bg-destructive text-destructive-foreground rounded-full shadow-md hover:bg-destructive/90 transition-colors z-10"
          title="Remove avatar"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
