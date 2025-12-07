import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { isVideoUrl } from '@/lib/mediaUtils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Story {
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
}

interface UserWithStories {
  user_id: string;
  username: string;
  avatar_url: string | null;
  stories: Story[];
}

interface StoryViewerProps {
  userStories: UserWithStories;
  onClose: () => void;
  allUsersStories: UserWithStories[];
  onNavigateUser: (user: UserWithStories) => void;
}

export function StoryViewer({ userStories, onClose, allUsersStories, onNavigateUser }: StoryViewerProps) {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [likes, setLikes] = useState<Record<string, { isLiked: boolean; count: number }>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const currentStory = userStories.stories[currentIndex];
  const isVideo = isVideoUrl(currentStory.image_url);

  const currentUserIndex = allUsersStories.findIndex(u => u.user_id === userStories.user_id);
  const hasNextUser = currentUserIndex < allUsersStories.length - 1;
  const hasPrevUser = currentUserIndex > 0;

  // Fetch likes for current story
  useEffect(() => {
    const fetchLikes = async () => {
      if (!currentStory) return;
      
      const { data } = await supabase
        .from('story_likes')
        .select('user_id')
        .eq('story_id', currentStory.id);

      const likesList = data || [];
      setLikes(prev => ({
        ...prev,
        [currentStory.id]: {
          isLiked: likesList.some(l => l.user_id === user?.id),
          count: likesList.length,
        }
      }));
    };

    fetchLikes();
  }, [currentStory?.id, user?.id]);

  const handleLike = async () => {
    if (!user || !currentStory) {
      toast.error('Please sign in to like stories');
      return;
    }

    const storyLike = likes[currentStory.id] || { isLiked: false, count: 0 };
    
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 400);

    if (storyLike.isLiked) {
      setLikes(prev => ({
        ...prev,
        [currentStory.id]: { isLiked: false, count: storyLike.count - 1 }
      }));
      
      const { error } = await supabase
        .from('story_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('story_id', currentStory.id);

      if (error) {
        setLikes(prev => ({
          ...prev,
          [currentStory.id]: { isLiked: true, count: storyLike.count }
        }));
        toast.error('Failed to unlike story');
      }
    } else {
      setLikes(prev => ({
        ...prev,
        [currentStory.id]: { isLiked: true, count: storyLike.count + 1 }
      }));
      
      const { error } = await supabase
        .from('story_likes')
        .insert({ user_id: user.id, story_id: currentStory.id });

      if (error) {
        setLikes(prev => ({
          ...prev,
          [currentStory.id]: { isLiked: false, count: storyLike.count }
        }));
        toast.error('Failed to like story');
      }
    }
  };

  const goToNextStory = useCallback(() => {
    if (currentIndex < userStories.stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
    } else if (hasNextUser) {
      onNavigateUser(allUsersStories[currentUserIndex + 1]);
      setCurrentIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, userStories.stories.length, hasNextUser, allUsersStories, currentUserIndex, onNavigateUser, onClose]);

  const goToPrevStory = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
    } else if (hasPrevUser) {
      const prevUser = allUsersStories[currentUserIndex - 1];
      onNavigateUser(prevUser);
      setCurrentIndex(prevUser.stories.length - 1);
      setProgress(0);
    }
  }, [currentIndex, hasPrevUser, allUsersStories, currentUserIndex, onNavigateUser]);

  // Auto-advance timer for images
  useEffect(() => {
    if (isVideo || isPaused) return;

    const duration = 5000;
    const interval = 50;
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          goToNextStory();
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentIndex, goToNextStory, isVideo, isPaused]);

  // Video progress tracking
  useEffect(() => {
    if (!isVideo || !videoRef.current) return;

    const video = videoRef.current;
    
    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    const handleEnded = () => {
      goToNextStory();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    video.play().catch(() => {});

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [currentIndex, isVideo, goToNextStory]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToNextStory();
      if (e.key === 'ArrowLeft') goToPrevStory();
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        setIsPaused(prev => !prev);
        if (videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.play();
          } else {
            videoRef.current.pause();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextStory, goToPrevStory, onClose]);

  // Reset when user changes
  useEffect(() => {
    setCurrentIndex(0);
    setProgress(0);
  }, [userStories.user_id]);

  const currentLike = likes[currentStory?.id] || { isLiked: false, count: 0 };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
      <div className="relative w-full max-w-md h-full max-h-[85vh] mx-auto">
        {/* Story Content */}
        <div className="relative h-full bg-foreground/5 rounded-xl overflow-hidden">
          {isVideo ? (
            <video
              ref={videoRef}
              src={currentStory.image_url}
              className="w-full h-full object-contain"
              playsInline
              muted
            />
          ) : (
            <img
              src={currentStory.image_url}
              alt="Story"
              className="w-full h-full object-contain"
            />
          )}

          {/* Progress Bars */}
          <div className="absolute top-0 left-0 right-0 p-2 flex gap-1">
            {userStories.stories.map((_, index) => (
              <div key={index} className="flex-1 h-0.5 bg-foreground/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground transition-all duration-75"
                  style={{
                    width: index < currentIndex ? '100%' : index === currentIndex ? `${progress}%` : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-6 left-0 right-0 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 border border-background">
                <AvatarImage src={userStories.avatar_url || undefined} />
                <AvatarFallback className="bg-secondary text-foreground text-xs">
                  {userStories.username[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground drop-shadow-sm">
                  {userStories.username}
                </p>
                <p className="text-xs text-foreground/70 drop-shadow-sm">
                  {formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-foreground/20 hover:bg-foreground/30 transition-colors"
            >
              <X className="h-5 w-5 text-foreground" />
            </button>
          </div>

          {/* Like Button */}
          <div className="absolute bottom-6 left-0 right-0 px-4 flex justify-center">
            <button
              onClick={handleLike}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full bg-foreground/20 hover:bg-foreground/30 transition-all",
                currentLike.isLiked ? "text-coral" : "text-foreground"
              )}
            >
              <Heart 
                className={cn(
                  "h-6 w-6 transition-all",
                  currentLike.isLiked && "fill-coral",
                  isAnimating && "animate-heart"
                )} 
              />
              <span className="font-medium">{currentLike.count}</span>
            </button>
          </div>

          {/* Navigation Areas */}
          <button
            onClick={goToPrevStory}
            className="absolute left-0 top-20 bottom-20 w-1/3 cursor-pointer"
            aria-label="Previous story"
          />
          <button
            onClick={goToNextStory}
            className="absolute right-0 top-20 bottom-20 w-1/3 cursor-pointer"
            aria-label="Next story"
          />

          {/* Navigation Arrows */}
          {(currentIndex > 0 || hasPrevUser) && (
            <button
              onClick={goToPrevStory}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-foreground/20 hover:bg-foreground/30 transition-colors opacity-0 hover:opacity-100"
            >
              <ChevronLeft className="h-6 w-6 text-foreground" />
            </button>
          )}
          {(currentIndex < userStories.stories.length - 1 || hasNextUser) && (
            <button
              onClick={goToNextStory}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-foreground/20 hover:bg-foreground/30 transition-colors opacity-0 hover:opacity-100"
            >
              <ChevronRight className="h-6 w-6 text-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
