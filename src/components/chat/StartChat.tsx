import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { MessageCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StartChatProps {
  targetUserId: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
}

export function StartChat({ targetUserId, variant = 'outline', size = 'sm', showText = true }: StartChatProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleStartChat = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (user.id === targetUserId) {
      toast({
        title: 'Error',
        description: "You can't chat with yourself",
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Check if a conversation already exists between these users
      const { data: myConversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (myConversations && myConversations.length > 0) {
        const conversationIds = myConversations.map(c => c.conversation_id);
        
        const { data: existingConv } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', targetUserId)
          .in('conversation_id', conversationIds)
          .limit(1);

        if (existingConv && existingConv.length > 0) {
          // Conversation exists, navigate to it
          navigate(`/messages?conversation=${existingConv[0].conversation_id}`);
          return;
        }
      }

      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();

      if (convError) throw convError;

      // Add both participants
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConv.id, user_id: user.id },
          { conversation_id: newConv.id, user_id: targetUserId },
        ]);

      if (partError) throw partError;

      navigate(`/messages?conversation=${newConv.id}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        title: 'Error',
        description: 'Failed to start conversation',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (user?.id === targetUserId) return null;

  return (
    <Button variant={variant} size={size} onClick={handleStartChat} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <MessageCircle className="h-4 w-4" />
          {showText && <span className="ml-2">Message</span>}
        </>
      )}
    </Button>
  );
}
