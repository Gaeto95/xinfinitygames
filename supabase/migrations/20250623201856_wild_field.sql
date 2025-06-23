/*
  # Add Voting System

  1. New Tables
    - `game_votes`
      - `id` (uuid, primary key)
      - `game_id` (uuid, foreign key to games)
      - `ip_address` (text, hashed for privacy)
      - `vote` (integer, 1 for upvote, -1 for downvote)
      - `created_at` (timestamp)
    
  2. New Columns
    - Add `vote_score` to games table (default 0)
    - Add `vote_count` to games table (default 0)
    
  3. Security
    - Enable RLS on `game_votes` table
    - Add policies for anonymous voting
    - Add function to calculate vote scores
    - Add trigger to auto-delete low-rated games

  4. Functions
    - Function to hash IP addresses for privacy
    - Function to update game vote scores
    - Function to clean up low-rated games
*/

-- Add voting columns to games table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'vote_score'
  ) THEN
    ALTER TABLE games ADD COLUMN vote_score integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'vote_count'
  ) THEN
    ALTER TABLE games ADD COLUMN vote_count integer DEFAULT 0;
  END IF;
END $$;

-- Create game_votes table
CREATE TABLE IF NOT EXISTS game_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  ip_hash text NOT NULL,
  vote integer NOT NULL CHECK (vote IN (-1, 1)),
  created_at timestamptz DEFAULT now(),
  UNIQUE(game_id, ip_hash)
);

-- Enable RLS
ALTER TABLE game_votes ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to vote
CREATE POLICY "Anyone can vote" ON game_votes
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow reading votes for statistics
CREATE POLICY "Anyone can read votes" ON game_votes
  FOR SELECT TO anon
  USING (true);

-- Function to hash IP addresses for privacy
CREATE OR REPLACE FUNCTION hash_ip(ip_address text)
RETURNS text AS $$
BEGIN
  RETURN encode(digest(ip_address || 'salt_for_privacy', 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to update game vote scores
CREATE OR REPLACE FUNCTION update_game_vote_score(target_game_id uuid)
RETURNS void AS $$
DECLARE
  total_score integer;
  total_count integer;
BEGIN
  SELECT 
    COALESCE(SUM(vote), 0),
    COUNT(*)
  INTO total_score, total_count
  FROM game_votes 
  WHERE game_id = target_game_id;
  
  UPDATE games 
  SET 
    vote_score = total_score,
    vote_count = total_count
  WHERE id = target_game_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up low-rated games
CREATE OR REPLACE FUNCTION cleanup_low_rated_games()
RETURNS void AS $$
BEGIN
  -- Delete games with score <= -5 and at least 10 votes
  DELETE FROM games 
  WHERE vote_score <= -5 
    AND vote_count >= 10 
    AND created_at < NOW() - INTERVAL '1 hour'; -- Give games at least 1 hour
    
  -- Also delete games with score <= -3 and at least 20 votes
  DELETE FROM games 
  WHERE vote_score <= -3 
    AND vote_count >= 20 
    AND created_at < NOW() - INTERVAL '2 hours'; -- Give more time for higher vote counts
END;
$$ LANGUAGE plpgsql;

-- Trigger to update vote scores when votes are added/updated
CREATE OR REPLACE FUNCTION trigger_update_vote_score()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM update_game_vote_score(NEW.game_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM update_game_vote_score(OLD.game_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_vote_score_trigger ON game_votes;
CREATE TRIGGER update_vote_score_trigger
  AFTER INSERT OR UPDATE OR DELETE ON game_votes
  FOR EACH ROW EXECUTE FUNCTION trigger_update_vote_score();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_game_votes_game_id ON game_votes(game_id);
CREATE INDEX IF NOT EXISTS idx_game_votes_ip_hash ON game_votes(ip_hash);
CREATE INDEX IF NOT EXISTS idx_games_vote_score ON games(vote_score DESC);