import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PostCardProps {
  post: {
    id: string;
    image_url: string;
    caption: string | null;
    created_at: string;
    user_id: string;
    profiles: {
      username: string;
      avatar_url: string | null;
      full_name: string | null;
    };
    likes: { user_id: string }[];
    comments: { id: string }[];
  };
  onLikeUpdate?: () => void;
  onCommentClick?: () => void;
}

export function PostCard({ post, onLikeUpdate, onCommentClick }: PostCardProps) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(
    post.likes.some((like) => like.user_id === user?.id)
  );
  const [likesCount, setLikesCount] = useState(post.likes.length);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleLike = async () => {
    if (!user) {
      toast.error('Please sign in to like posts');
      return;
    }

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 400);

    if (isLiked) {
      setIsLiked(false);
      setLikesCount((prev) => prev - 1);
      
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', post.id);

      if (error) {
        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
        toast.error('Failed to unlike post');
      }
    } else {
      setIsLiked(true);
      setLikesCount((prev) => prev + 1);
      
      const { error } = await supabase
        .from('likes')
        .insert({ user_id: user.id, post_id: post.id });

      if (error) {
        setIsLiked(false);
        setLikesCount((prev) => prev - 1);
        toast.error('Failed to like post');
      }
    }

    onLikeUpdate?.();
  };

  const handleDoubleClick = () => {
    if (!isLiked) {
      handleLike();
    }
  };

  return (
    <article className="bg-card rounded-xl shadow-card overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Link 
          to={`/profile/${post.user_id}`}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
            <AvatarImage src={post.profiles.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {post.profiles.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-foreground">{post.profiles.username}</p>
          </div>
        </Link>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>

      {/* Image */}
      <div 
        className="relative aspect-square bg-muted cursor-pointer"
        onDoubleClick={handleDoubleClick}
      >
        <img
          src={post.image_url}
          alt={post.caption || 'Post image'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Actions */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className={cn(
              "flex items-center gap-1.5 transition-all duration-200",
              isLiked ? "text-coral" : "text-foreground hover:text-coral"
            )}
          >
            <Heart 
              className={cn(
                "h-6 w-6 transition-all",
                isLiked && "fill-coral",
                isAnimating && "animate-heart"
              )} 
            />
            <span className="font-medium">{likesCount}</span>
          </button>
          
          <button
            onClick={onCommentClick}
            className="flex items-center gap-1.5 text-foreground hover:text-primary transition-colors"
          >
            <MessageCircle className="h-6 w-6" />
            <span className="font-medium">{post.comments.length}</span>
          </button>
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="text-foreground">
            <Link 
              to={`/profile/${post.user_id}`}
              className="font-semibold hover:underline mr-2"
            >
              {post.profiles.username}
            </Link>
            {post.caption}
          </p>
        )}

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
        </p>
      </div>
    </article>
  );
}
