import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ChatList } from '@/components/chat/ChatList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle } from 'lucide-react';

interface OtherUser {
  id: string;
  username: string;
  avatar_url: string | null;
  full_name: string | null;
}

export default function Messages() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    if (conversationId && user) {
      loadConversation(conversationId);
    }
  }, [searchParams, user]);

  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadConversation = async (conversationId: string) => {
    if (!user) return;

    try {
      // Get other participant
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id)
        .limit(1);

      if (!participants || participants.length === 0) return;

      const otherUserId = participants[0].user_id;

      // Get other user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, full_name')
        .eq('user_id', otherUserId)
        .single();

      if (profile) {
        setSelectedConversation(conversationId);
        setOtherUser({
          id: profile.user_id,
          username: profile.username,
          avatar_url: profile.avatar_url,
          full_name: profile.full_name,
        });
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const handleSelectConversation = (conversationId: string, user: OtherUser) => {
    setSelectedConversation(conversationId);
    setOtherUser(user);
    navigate(`/messages?conversation=${conversationId}`, { replace: true });
  };

  const handleBack = () => {
    setSelectedConversation(null);
    setOtherUser(null);
    navigate('/messages', { replace: true });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-0 pb-16 md:pt-20 md:pb-0">
      <div className="max-w-5xl mx-auto">
        <div className="flex h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] border-x border-border bg-card">
          {/* Chat List - Hidden on mobile when conversation is selected */}
          <div
            className={`w-full md:w-80 border-r border-border ${
              isMobileView && selectedConversation ? 'hidden' : 'block'
            }`}
          >
            <div className="p-4 border-b border-border">
              <h1 className="font-display text-xl font-semibold">Messages</h1>
            </div>
            <ChatList
              onSelectConversation={handleSelectConversation}
              selectedConversationId={selectedConversation || undefined}
            />
          </div>

          {/* Chat Window */}
          <div
            className={`flex-1 ${
              isMobileView && !selectedConversation ? 'hidden' : 'block'
            }`}
          >
            {selectedConversation && otherUser ? (
              <ChatWindow
                conversationId={selectedConversation}
                otherUser={otherUser}
                onBack={handleBack}
              />
            ) : (
              <div className="hidden md:flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageCircle className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">Your Messages</p>
                <p className="text-sm">Select a conversation to start chatting</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
