import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PostCard } from '@/components/post/PostCard';
import { CommentSection } from '@/components/post/CommentSection';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface Profile {
  username: string;
  avatar_url: string | null;
  full_name: string | null;
}

interface Post {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  user_id: string;
  profiles: Profile;
  likes: { user_id: string }[];
  comments: { id: string }[];
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

export default function Feed() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchPosts = async () => {
    if (!user) return;

    // Get users the current user follows
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    const followingIds = following?.map(f => f.following_id) || [];
    // Include own posts too
    followingIds.push(user.id);

    const { data: postsData, error } = await supabase
      .from('posts')
      .select('*')
      .in('user_id', followingIds)
      .order('created_at', { ascending: false });

    if (error || !postsData) {
      setLoading(false);
      return;
    }

    // Fetch profiles, likes, and comments for each post
    const enrichedPosts = await Promise.all(
      postsData.map(async (post) => {
        const [profileRes, likesRes, commentsRes] = await Promise.all([
          supabase.from('profiles').select('username, avatar_url, full_name').eq('user_id', post.user_id).single(),
          supabase.from('likes').select('user_id').eq('post_id', post.id),
          supabase.from('comments').select('id').eq('post_id', post.id),
        ]);

        return {
          ...post,
          profiles: profileRes.data || { username: 'Unknown', avatar_url: null, full_name: null },
          likes: likesRes.data || [],
          comments: commentsRes.data || [],
        };
      })
    );

    setPosts(enrichedPosts);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user]);

  const fetchComments = async (postId: string) => {
    const { data: commentsData } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (!commentsData) return;

    const enrichedComments = await Promise.all(
      commentsData.map(async (comment) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('user_id', comment.user_id)
          .single();

        return {
          ...comment,
          profiles: profile || { username: 'Unknown', avatar_url: null },
        };
      })
    );

    setComments(enrichedComments);
  };

  const handleCommentClick = (post: Post) => {
    setSelectedPost(post);
    fetchComments(post.id);
  };

  if (authLoading || loading) {
    return (
      <div className="pt-4 md:pt-20 pb-20 md:pb-4">
        <div className="max-w-lg mx-auto px-4 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="aspect-square w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 md:pt-20 pb-20 md:pb-4">
      <div className="max-w-lg mx-auto px-4">
        {/* Mobile Logo */}
        <div className="md:hidden text-center mb-6">
          <h1 className="font-display text-3xl font-bold gradient-text">
            Pixela
          </h1>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-12 animate-fade-in">
            <h2 className="font-display text-2xl font-semibold text-foreground mb-2">
              Your feed is empty
            </h2>
            <p className="text-muted-foreground mb-6">
              Start following people to see their posts here, or create your first post!
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="coral" asChild>
                <Link to="/explore">Explore</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/create">Create Post</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLikeUpdate={fetchPosts}
                onCommentClick={() => handleCommentClick(post)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Comments Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Comments</DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <CommentSection
              postId={selectedPost.id}
              comments={comments}
              onCommentAdded={() => {
                fetchComments(selectedPost.id);
                fetchPosts();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
