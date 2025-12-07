import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { StoryViewer } from './StoryViewer';
import { StoryCreator } from './StoryCreator';

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

export function StoriesCarousel() {
  const { user } = useAuth();
  const [usersWithStories, setUsersWithStories] = useState<UserWithStories[]>([]);
  const [currentUserHasStory, setCurrentUserHasStory] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ username: string; avatar_url: string | null } | null>(null);
  const [selectedUserStories, setSelectedUserStories] = useState<UserWithStories | null>(null);
  const [showCreator, setShowCreator] = useState(false);

  const fetchStories = async () => {
    if (!user) return;

    // Get stories from last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get users the current user follows + self
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    const followingIds = following?.map(f => f.following_id) || [];
    followingIds.push(user.id);

    // Fetch recent stories
    const { data: storiesData } = await supabase
      .from('stories')
      .select('*')
      .in('user_id', followingIds)
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false });

    if (!storiesData) return;

    // Group stories by user
    const userStoriesMap = new Map<string, Story[]>();
    storiesData.forEach(story => {
      const existing = userStoriesMap.get(story.user_id) || [];
      existing.push(story);
      userStoriesMap.set(story.user_id, existing);
    });

    // Fetch profiles for users with stories
    const userIds = Array.from(userStoriesMap.keys());
    if (userIds.length === 0) {
      setUsersWithStories([]);
      setCurrentUserHasStory(false);
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url')
      .in('user_id', userIds);

    if (!profiles) return;

    // Build users with stories array, current user first
    const usersStories: UserWithStories[] = [];
    let hasCurrentUserStory = false;

    profiles.forEach(profile => {
      const stories = userStoriesMap.get(profile.user_id) || [];
      const userWithStories = {
        user_id: profile.user_id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        stories: stories.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
      };

      if (profile.user_id === user.id) {
        hasCurrentUserStory = true;
        usersStories.unshift(userWithStories); // Current user first
      } else {
        usersStories.push(userWithStories);
      }
    });

    setUsersWithStories(usersStories);
    setCurrentUserHasStory(hasCurrentUserStory);
  };

  const fetchCurrentUserProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setCurrentUserProfile(data);
    }
  };

  useEffect(() => {
    fetchStories();
    fetchCurrentUserProfile();
  }, [user]);

  const handleStoryCreated = () => {
    setShowCreator(false);
    fetchStories();
  };

  return (
    <>
      <div className="bg-card rounded-xl p-4 mb-6 overflow-hidden">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
          {/* Add Story Button (only if user doesn't have an active story) */}
          {!currentUserHasStory && currentUserProfile && (
            <button
              onClick={() => setShowCreator(true)}
              className="flex flex-col items-center gap-1 flex-shrink-0"
            >
              <div className="relative">
                <Avatar className="h-16 w-16 border-2 border-border">
                  <AvatarImage src={currentUserProfile.avatar_url || undefined} />
                  <AvatarFallback className="bg-secondary text-foreground">
                    {currentUserProfile.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
                  <Plus className="h-3 w-3 text-primary-foreground" />
                </div>
              </div>
              <span className="text-xs text-muted-foreground max-w-[64px] truncate">
                Your story
              </span>
            </button>
          )}

          {/* Story Circles */}
          {usersWithStories.map((userStories) => (
            <button
              key={userStories.user_id}
              onClick={() => setSelectedUserStories(userStories)}
              className="flex flex-col items-center gap-1 flex-shrink-0"
            >
              <div className="p-[3px] rounded-full bg-gradient-to-tr from-primary via-accent to-primary">
                <Avatar className="h-16 w-16 border-2 border-background">
                  <AvatarImage src={userStories.avatar_url || undefined} />
                  <AvatarFallback className="bg-secondary text-foreground">
                    {userStories.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span className="text-xs text-foreground max-w-[64px] truncate">
                {userStories.user_id === user?.id ? 'Your story' : userStories.username}
              </span>
            </button>
          ))}

          {/* Add Story Button if user already has a story */}
          {currentUserHasStory && (
            <button
              onClick={() => setShowCreator(true)}
              className="flex flex-col items-center gap-1 flex-shrink-0"
            >
              <div className="h-16 w-16 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-secondary/50 hover:bg-secondary transition-colors">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">Add</span>
            </button>
          )}

          {/* Placeholder if no stories */}
          {usersWithStories.length === 0 && currentUserHasStory === false && !currentUserProfile && (
            <div className="text-sm text-muted-foreground py-4">
              No stories to show
            </div>
          )}
        </div>
      </div>

      {/* Story Viewer Modal */}
      {selectedUserStories && (
        <StoryViewer
          userStories={selectedUserStories}
          onClose={() => setSelectedUserStories(null)}
          allUsersStories={usersWithStories}
          onNavigateUser={(userStories) => setSelectedUserStories(userStories)}
        />
      )}

      {/* Story Creator Modal */}
      {showCreator && (
        <StoryCreator
          onClose={() => setShowCreator(false)}
          onStoryCreated={handleStoryCreated}
        />
      )}
    </>
  );
}
