/*
  # Create storage bucket for game thumbnails

  1. Storage Setup
    - Create public bucket for game thumbnails
    - Set up proper access policies
    - Enable public access for thumbnail viewing

  2. Security
    - Allow public read access for thumbnails
    - Restrict upload to service role only
*/

-- Create storage bucket for game thumbnails
INSERT INTO storage.buckets (id, name, public) 
VALUES ('game-thumbnails', 'game-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to view thumbnails
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'game-thumbnails');

-- Allow service role to upload thumbnails
CREATE POLICY "Service Role Upload" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'game-thumbnails' AND auth.role() = 'service_role');

-- Allow service role to delete thumbnails
CREATE POLICY "Service Role Delete" ON storage.objects FOR DELETE 
USING (bucket_id = 'game-thumbnails' AND auth.role() = 'service_role');