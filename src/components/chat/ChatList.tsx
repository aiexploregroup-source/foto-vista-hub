import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle } from 'lucide-react';

interface Conversation {
  id: string;
  updated_at: string;
  other_user: {
    id: string;
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
  last_message?: {
    content: string;
    created_at: string;
  };
}

interface ChatListProps {
  onSelectConversation: (conversationId: string, otherUser: Conversation['other_user']) => void;
  selectedConversationId?: string;
}

export function ChatList({ onSelectConversation, selectedConversationId }: ChatListProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    fetchConversations();
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      // Get all conversations the user is part of
      const { data: participations, error: partError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (partError) throw partError;

      if (!participations || participations.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationIds = participations.map(p => p.conversation_id);

      // Get conversation details
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('id, updated_at')
        .in('id', conversationIds)
        .order('updated_at', { ascending: false });

      if (convError) throw convError;

      // For each conversation, get the other participant and last message
      const conversationsWithDetails: Conversation[] = [];

      for (const conv of convData || []) {
        // Get other participant
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conv.id)
          .neq('user_id', user.id)
          .limit(1);

        if (!participants || participants.length === 0) continue;

        const otherUserId = participants[0].user_id;

        // Get other user's profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url, full_name')
          .eq('user_id', otherUserId)
          .single();

        if (!profile) continue;

        // Get last message
        const { data: messages } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1);

        conversationsWithDetails.push({
          id: conv.id,
          updated_at: conv.updated_at,
          other_user: {
            id: profile.user_id,
            username: profile.username,
            avatar_url: profile.avatar_url,
            full_name: profile.full_name,
          },
          last_message: messages?.[0],
        });
      }

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
        <MessageCircle className="h-12 w-12 mb-2 opacity-50" />
        <p className="text-sm">No conversations yet</p>
        <p className="text-xs">Start chatting with someone!</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-200px)] md:h-[calc(100vh-180px)]">
      <div className="divide-y divide-border">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelectConversation(conv.id, conv.other_user)}
            className={`w-full p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left ${
              selectedConversationId === conv.id ? 'bg-accent' : ''
            }`}
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={conv.other_user.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {conv.other_user.username[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-medium truncate">{conv.other_user.username}</span>
                {conv.last_message && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: true })}
                  </span>
                )}
              </div>
              {conv.last_message && (
                <p className="text-sm text-muted-foreground truncate">
                  {conv.last_message.content}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
