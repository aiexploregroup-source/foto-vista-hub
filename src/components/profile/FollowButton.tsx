import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FollowButtonProps {
  targetUserId: string;
  onFollowChange?: () => void;
}

export function FollowButton({ targetUserId, onFollowChange }: FollowButtonProps) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle();

      if (!error) {
        setIsFollowing(!!data);
      }
      setIsLoading(false);
    };

    checkFollowStatus();
  }, [user, targetUserId]);

  const handleFollow = async () => {
    if (!user) {
      toast.error('Please sign in to follow users');
      return;
    }

    setIsLoading(true);

    if (isFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId);

      if (error) {
        toast.error('Failed to unfollow');
      } else {
        setIsFollowing(false);
        onFollowChange?.();
      }
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: targetUserId,
        });

      if (error) {
        toast.error('Failed to follow');
      } else {
        setIsFollowing(true);
        onFollowChange?.();
      }
    }

    setIsLoading(false);
  };

  if (!user || user.id === targetUserId) {
    return null;
  }

  return (
    <Button
      variant={isFollowing ? "outline" : "coral"}
      onClick={handleFollow}
      disabled={isLoading}
      className="min-w-[100px]"
    >
      {isFollowing ? 'Following' : 'Follow'}
    </Button>
  );
}
