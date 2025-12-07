import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const currentStory = userStories.stories[currentIndex];

  const currentUserIndex = allUsersStories.findIndex(u => u.user_id === userStories.user_id);
  const hasNextUser = currentUserIndex < allUsersStories.length - 1;
  const hasPrevUser = currentUserIndex > 0;

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

  // Auto-advance timer
  useEffect(() => {
    const duration = 5000; // 5 seconds per story
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
  }, [currentIndex, goToNextStory]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goToNextStory();
      if (e.key === 'ArrowLeft') goToPrevStory();
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextStory, goToPrevStory, onClose]);

  // Reset when user changes
  useEffect(() => {
    setCurrentIndex(0);
    setProgress(0);
  }, [userStories.user_id]);

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
      <div className="relative w-full max-w-md h-full max-h-[85vh] mx-auto">
        {/* Story Image */}
        <div className="relative h-full bg-foreground/5 rounded-xl overflow-hidden">
          <img
            src={currentStory.image_url}
            alt="Story"
            className="w-full h-full object-contain"
          />

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

          {/* Navigation Areas */}
          <button
            onClick={goToPrevStory}
            className="absolute left-0 top-20 bottom-0 w-1/3 cursor-pointer"
            aria-label="Previous story"
          />
          <button
            onClick={goToNextStory}
            className="absolute right-0 top-20 bottom-0 w-1/3 cursor-pointer"
            aria-label="Next story"
          />

          {/* Navigation Arrows (visible on hover) */}
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
