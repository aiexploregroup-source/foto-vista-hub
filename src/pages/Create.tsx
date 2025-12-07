import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, X, Film } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { validateMediaFile, isVideoFile, getAcceptedMediaTypes } from '@/lib/mediaUtils';

export default function Create() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateMediaFile(file);
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
      setIsVideo(isVideoFile(file));
    }
  };

  const handleRemoveMedia = () => {
    setSelectedFile(null);
    setPreview(null);
    setIsVideo(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!user || !selectedFile) return;

    setIsUploading(true);

    try {
      // Upload media to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(fileName);

      // Create post
      const { error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          caption: caption.trim() || null,
        });

      if (postError) throw postError;

      toast.success('Post created successfully!');
      navigate('/');
    } catch (error: any) {
      toast.error('Failed to create post: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (authLoading) {
    return null;
  }

  return (
    <div className="pt-4 md:pt-20 pb-20 md:pb-4 min-h-screen">
      <div className="max-w-lg mx-auto px-4">
        <h1 className="font-display text-2xl font-semibold text-foreground mb-6">
          Create Post
        </h1>

        <div className="space-y-6 animate-fade-in">
          {/* Media Upload */}
          <div 
            className={`relative aspect-square rounded-xl border-2 border-dashed transition-colors overflow-hidden ${
              preview 
                ? 'border-transparent' 
                : 'border-border hover:border-primary cursor-pointer'
            }`}
            onClick={() => !preview && fileInputRef.current?.click()}
          >
            {preview ? (
              <>
                {isVideo ? (
                  <video
                    src={preview}
                    className="w-full h-full object-cover"
                    controls
                    playsInline
                  />
                ) : (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveMedia();
                  }}
                  className="absolute top-3 right-3 p-2 rounded-full bg-foreground/80 text-background hover:bg-foreground transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <div className="flex items-center gap-3 mb-3">
                  <ImagePlus className="h-10 w-10" />
                  <Film className="h-10 w-10" />
                </div>
                <p className="font-medium">Click to upload an image or video</p>
                <p className="text-sm mt-1">Images up to 10MB, videos up to 50MB</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={getAcceptedMediaTypes()}
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Caption
            </label>
            <Textarea
              placeholder="Write a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-[100px] resize-none bg-secondary/50 border-0"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {caption.length}/500
            </p>
          </div>

          {/* Submit */}
          <Button
            variant="coral"
            className="w-full"
            onClick={handleSubmit}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Share Post'}
          </Button>
        </div>
      </div>
    </div>
  );
}
