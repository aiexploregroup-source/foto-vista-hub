import { useState, useRef } from 'react';
import { X, ImagePlus, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface StoryCreatorProps {
  onClose: () => void;
  onStoryCreated: () => void;
}

export function StoryCreator({ onClose, onStoryCreated }: StoryCreatorProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!user || !selectedFile) return;

    setIsUploading(true);

    try {
      // Upload image to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `stories/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(fileName);

      // Create story
      const { error: storyError } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
        });

      if (storyError) throw storyError;

      toast.success('Story added!');
      onStoryCreated();
    } catch (error: any) {
      toast.error('Failed to create story: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-card rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-display text-lg font-semibold">Add to Story</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {preview ? (
            <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-secondary">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-contain"
              />
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreview(null);
                }}
                className="absolute top-3 right-3 p-2 rounded-full bg-foreground/80 text-background hover:bg-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="aspect-[9/16] rounded-lg border-2 border-dashed border-border hover:border-primary cursor-pointer transition-colors flex flex-col items-center justify-center"
            >
              <ImagePlus className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="font-medium text-muted-foreground">Choose a photo</p>
              <p className="text-sm text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Submit Button */}
          {preview && (
            <Button
              variant="coral"
              className="w-full mt-4"
              onClick={handleSubmit}
              disabled={isUploading}
            >
              {isUploading ? (
                'Uploading...'
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Share to Story
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
