-- Fix 1: Restrict follows table to authenticated users only
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;

CREATE POLICY "Authenticated users can view follows"
ON public.follows
FOR SELECT
TO authenticated
USING (true);

-- Fix 2: Add length constraints to profiles table for input validation
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_username_length CHECK (length(username) <= 30),
ADD CONSTRAINT profiles_bio_length CHECK (length(bio) <= 500),
ADD CONSTRAINT profiles_fullname_length CHECK (length(full_name) <= 100);