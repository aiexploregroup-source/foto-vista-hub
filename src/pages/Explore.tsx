import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { PostCard } from '@/components/post/PostCard';
import { CommentSection } from '@/components/post/CommentSection';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

export default function Explore() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'feed'>('grid');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);

  const fetchPosts = async () => {
    const { data: postsData, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

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
    fetchPosts();
  }, []);

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

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    fetchComments(post.id);
  };

  if (loading) {
    return (
      <div className="pt-4 md:pt-20 pb-20 md:pb-4">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-1 md:gap-4">
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-md" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 md:pt-20 pb-20 md:pb-4">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Explore
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('feed')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'feed' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              Feed
            </button>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-12 animate-fade-in">
            <h2 className="font-display text-2xl font-semibold text-foreground mb-2">
              No posts yet
            </h2>
            <p className="text-muted-foreground">
              Be the first to share something!
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-3 gap-1 md:gap-4">
            {posts.map((post, index) => (
              <button
                key={post.id}
                onClick={() => handlePostClick(post)}
                className="aspect-square relative group overflow-hidden rounded-md md:rounded-lg animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <img
                  src={post.image_url}
                  alt={post.caption || 'Post'}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-4 text-primary-foreground">
                    <span className="flex items-center gap-1 font-medium">
                      ♥ {post.likes.length}
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      💬 {post.comments.length}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="max-w-lg mx-auto space-y-6">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLikeUpdate={fetchPosts}
                onCommentClick={() => handlePostClick(post)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Post Detail Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
          {selectedPost && (
            <div className="grid md:grid-cols-2">
              <div className="aspect-square bg-muted">
                <img
                  src={selectedPost.image_url}
                  alt={selectedPost.caption || 'Post'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 flex flex-col">
                <DialogHeader className="pb-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/profile/${selectedPost.user_id}`}
                      onClick={() => setSelectedPost(null)}
                      className="font-semibold hover:underline"
                    >
                      {selectedPost.profiles.username}
                    </Link>
                  </div>
                  {selectedPost.caption && (
                    <p className="text-sm text-foreground mt-2">
                      {selectedPost.caption}
                    </p>
                  )}
                </DialogHeader>
                <div className="flex-1 py-4 overflow-y-auto">
                  <CommentSection
                    postId={selectedPost.id}
                    comments={comments}
                    onCommentAdded={() => {
                      fetchComments(selectedPost.id);
                      fetchPosts();
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
