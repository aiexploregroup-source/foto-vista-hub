-- First, create a security definer function to check participation (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id uuid, uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id AND user_id = uid
  );
$$;

-- Drop the problematic policies on conversation_participants
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations they're in" ON conversation_participants;

-- Create new non-recursive policies for conversation_participants
CREATE POLICY "Users can view their own participation"
ON conversation_participants
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can add themselves or others to conversations"
ON conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  OR public.is_conversation_participant(conversation_id, auth.uid())
);

-- Update conversations SELECT policy to use the function
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
CREATE POLICY "Users can view their conversations"
ON conversations
FOR SELECT
TO authenticated
USING (public.is_conversation_participant(id, auth.uid()));

-- Update messages policies to use the function
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON messages;

CREATE POLICY "Users can view messages in their conversations"
ON messages
FOR SELECT
TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Users can send messages in their conversations"
ON messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() 
  AND public.is_conversation_participant(conversation_id, auth.uid())
);

CREATE POLICY "Users can update messages in their conversations"
ON messages
FOR UPDATE
TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()))
WITH CHECK (public.is_conversation_participant(conversation_id, auth.uid()));