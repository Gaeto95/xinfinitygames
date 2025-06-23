/*
  # Create games table for Infinite Arcade

  1. New Tables
    - `games`
      - `id` (uuid, primary key)
      - `title` (text)
      - `prompt` (text) 
      - `code` (text)
      - `thumbnail_url` (text)
      - `status` (text) - either 'pending' or 'approved'
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `games` table
    - Add policy for anonymous users to read approved games
    - Add policy for authenticated users (admins) to manage games
*/

CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  prompt text NOT NULL,
  code text NOT NULL,
  thumbnail_url text DEFAULT '/placeholder.png',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to read approved games
CREATE POLICY "Anyone can view approved games"
  ON games
  FOR SELECT
  TO anon
  USING (status = 'approved');

-- Allow authenticated users to manage all games (for admin panel)
CREATE POLICY "Authenticated users can manage games"
  ON games
  FOR ALL
  TO authenticated
  USING (true);

-- Allow service role to manage all games (for generation)
CREATE POLICY "Service role can manage games"
  ON games
  FOR ALL
  TO service_role
  USING (true);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_games_updated_at 
    BEFORE UPDATE ON games 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();