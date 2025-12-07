-- Drop the existing overly permissive SELECT policy on likes
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.likes;

-- Create a new policy that only allows authenticated users to view likes
-- This prevents anonymous scraping of user behavior data
CREATE POLICY "Authenticated users can view likes"
ON public.likes
FOR SELECT
TO authenticated
USING (true);