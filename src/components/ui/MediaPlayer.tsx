import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { isVideoUrl } from '@/lib/mediaUtils';
import { cn } from '@/lib/utils';

interface MediaPlayerProps {
  src: string;
  alt?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  onVideoEnd?: () => void;
  showControls?: boolean;
  aspectRatio?: 'square' | 'video' | 'story';
}

export function MediaPlayer({
  src,
  alt = 'Media content',
  className,
  autoPlay = false,
  muted = true,
  loop = false,
  onVideoEnd,
  showControls = true,
  aspectRatio = 'square',
}: MediaPlayerProps) {
  const isVideo = isVideoUrl(src);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);

  useEffect(() => {
    if (videoRef.current) {
      if (autoPlay) {
        videoRef.current.play().catch(() => {
          // Autoplay was prevented
          setIsPlaying(false);
        });
      }
    }
  }, [autoPlay, src]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    onVideoEnd?.();
  };

  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    story: 'aspect-[9/16]',
  };

  if (!isVideo) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn('w-full h-full object-cover', className)}
        loading="lazy"
      />
    );
  }

  return (
    <div className={cn('relative bg-black', aspectClasses[aspectRatio], className)}>
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        muted={isMuted}
        loop={loop}
        playsInline
        onEnded={handleVideoEnd}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      
      {showControls && (
        <>
          {/* Play/Pause overlay */}
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
          >
            {isPlaying ? (
              <Pause className="h-16 w-16 text-white drop-shadow-lg" />
            ) : (
              <Play className="h-16 w-16 text-white drop-shadow-lg" />
            )}
          </button>

          {/* Mute button */}
          <button
            onClick={toggleMute}
            className="absolute bottom-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
          >
            {isMuted ? (
              <VolumeX className="h-5 w-5 text-white" />
            ) : (
              <Volume2 className="h-5 w-5 text-white" />
            )}
          </button>
        </>
      )}
    </div>
  );
}
