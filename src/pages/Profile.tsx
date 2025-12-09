import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Settings, Camera, Film } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FollowButton } from '@/components/profile/FollowButton';
import { StartChat } from '@/components/chat/StartChat';
import { CommentSection } from '@/components/post/CommentSection';
import { toast } from 'sonner';
import { isVideoUrl } from '@/lib/mediaUtils';

interface Profile {
  id: string;
  user_id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

interface PostProfile {
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
  profiles: PostProfile;
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

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);

  const isOwnProfile = user?.id === userId;

  const fetchProfile = async () => {
    if (!userId) return;

    const { data: profileData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && profileData) {
      setProfile(profileData);
      setEditUsername(profileData.username);
      setEditFullName(profileData.full_name || '');
      setEditBio(profileData.bio || '');
    }
  };

  const fetchPosts = async () => {
    if (!userId) return;

    const { data: postsData, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !postsData) return;

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
  };

  const fetchFollowCounts = async () => {
    if (!userId) return;

    const [followersRes, followingRes] = await Promise.all([
      supabase.from('follows').select('id', { count: 'exact' }).eq('following_id', userId),
      supabase.from('follows').select('id', { count: 'exact' }).eq('follower_id', userId),
    ]);

    setFollowersCount(followersRes.count || 0);
    setFollowingCount(followingRes.count || 0);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProfile(), fetchPosts(), fetchFollowCounts()]);
      setLoading(false);
    };
    loadData();
  }, [userId]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: `${publicUrl}?t=${Date.now()}` })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast.success('Avatar updated!');
      fetchProfile();
    } catch (error: any) {
      toast.error('Failed to update avatar');
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    setIsUpdating(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        username: editUsername,
        full_name: editFullName || null,
        bio: editBio || null,
      })
      .eq('user_id', user.id);

    if (error) {
      if (error.message.includes('unique')) {
        toast.error('Username is already taken');
      } else {
        toast.error('Failed to update profile');
      }
    } else {
      toast.success('Profile updated!');
      setIsEditOpen(false);
      fetchProfile();
    }

    setIsUpdating(false);
  };

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
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12 mb-8">
            <Skeleton className="h-24 w-24 md:h-36 md:w-36 rounded-full" />
            <div className="flex-1 space-y-4 text-center md:text-left">
              <Skeleton className="h-8 w-32 mx-auto md:mx-0" />
              <div className="flex gap-8 justify-center md:justify-start">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="pt-4 md:pt-20 pb-20 md:pb-4 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold text-foreground mb-2">
            User not found
          </h1>
          <p className="text-muted-foreground">
            This user doesn't exist or has been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 md:pt-20 pb-20 md:pb-4">
      <div className="max-w-4xl mx-auto px-4">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12 mb-8 animate-fade-in">
          {/* Avatar */}
          <div className="relative group">
            <Avatar className="h-24 w-24 md:h-36 md:w-36 ring-4 ring-primary/20">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl md:text-4xl font-medium">
                {profile.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center bg-foreground/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Camera className="h-8 w-8 text-background" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
              <h1 className="font-display text-2xl font-semibold text-foreground">
                {profile.username}
              </h1>
              {isOwnProfile ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditOpen(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <FollowButton
                    targetUserId={userId!}
                    onFollowChange={fetchFollowCounts}
                  />
                  <StartChat targetUserId={userId!} />
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-8 justify-center md:justify-start mb-4">
              <div className="text-center">
                <p className="font-semibold text-foreground">{posts.length}</p>
                <p className="text-sm text-muted-foreground">posts</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">{followersCount}</p>
                <p className="text-sm text-muted-foreground">followers</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground">{followingCount}</p>
                <p className="text-sm text-muted-foreground">following</p>
              </div>
            </div>

            {/* Bio */}
            {(profile.full_name || profile.bio) && (
              <div>
                {profile.full_name && (
                  <p className="font-semibold text-foreground">{profile.full_name}</p>
                )}
                {profile.bio && (
                  <p className="text-muted-foreground mt-1">{profile.bio}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Posts Grid */}
        <div className="border-t border-border pt-6">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts yet</p>
              {isOwnProfile && (
                <Button variant="coral" className="mt-4" asChild>
                  <Link to="/create">Create your first post</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 md:gap-4">
              {posts.map((post, index) => {
                const isVideo = isVideoUrl(post.image_url);
                return (
                  <button
                    key={post.id}
                    onClick={() => handlePostClick(post)}
                    className="aspect-square relative group overflow-hidden rounded-md md:rounded-lg animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {isVideo ? (
                      <>
                        <video
                          src={post.image_url}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          muted
                          playsInline
                        />
                        <div className="absolute top-2 right-2 p-1 bg-foreground/50 rounded">
                          <Film className="h-4 w-4 text-background" />
                        </div>
                      </>
                    ) : (
                      <img
                        src={post.image_url}
                        alt={post.caption || 'Post'}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    )}
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
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="bg-secondary/50 border-0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                className="bg-secondary/50 border-0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className="bg-secondary/50 border-0 resize-none"
                maxLength={150}
              />
              <p className="text-xs text-muted-foreground text-right">
                {editBio.length}/150
              </p>
            </div>
            <Button
              variant="coral"
              className="w-full"
              onClick={handleUpdateProfile}
              disabled={isUpdating}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Post Detail Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden">
          {selectedPost && (
            <div className="grid md:grid-cols-2">
              <div className="aspect-square bg-muted">
                {isVideoUrl(selectedPost.image_url) ? (
                  <video
                    src={selectedPost.image_url}
                    className="w-full h-full object-cover"
                    controls
                    playsInline
                  />
                ) : (
                  <img
                    src={selectedPost.image_url}
                    alt={selectedPost.caption || 'Post'}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="p-4 flex flex-col">
                <DialogHeader className="pb-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      {selectedPost.profiles.username}
                    </span>
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
