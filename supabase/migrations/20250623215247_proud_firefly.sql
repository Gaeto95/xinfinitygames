/*
  # Add Auto-Generation Statistics System

  1. New Tables
    - `generation_stats`
      - `id` (uuid, primary key)
      - `total_games_generated` (integer)
      - `total_users_generated` (integer) 
      - `last_auto_generation` (timestamp)
      - `next_auto_generation` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Functions
    - Function to update generation statistics
    - Function to schedule next auto-generation

  3. Security
    - Enable RLS on `generation_stats` table
    - Allow public read access for statistics display
    - Allow service role to update statistics
*/

-- Create generation_stats table
CREATE TABLE IF NOT EXISTS generation_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_games_generated integer DEFAULT 0,
  total_users_generated integer DEFAULT 0,
  last_auto_generation timestamptz,
  next_auto_generation timestamptz DEFAULT (now() + interval '3 hours'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE generation_stats ENABLE ROW LEVEL SECURITY;

-- Allow public read access for statistics
CREATE POLICY "Anyone can read generation stats"
  ON generation_stats
  FOR SELECT
  TO anon
  USING (true);

-- Allow service role to manage statistics
CREATE POLICY "Service role can manage generation stats"
  ON generation_stats
  FOR ALL
  TO service_role
  USING (true);

-- Insert initial stats record
INSERT INTO generation_stats (total_games_generated, total_users_generated)
VALUES (0, 0)
ON CONFLICT DO NOTHING;

-- Function to update generation statistics
CREATE OR REPLACE FUNCTION update_generation_stats(is_auto_generation boolean DEFAULT false)
RETURNS void AS $$
DECLARE
  stats_record generation_stats%ROWTYPE;
BEGIN
  -- Get current stats
  SELECT * INTO stats_record FROM generation_stats LIMIT 1;
  
  IF stats_record.id IS NULL THEN
    -- Create initial record if none exists
    INSERT INTO generation_stats (total_games_generated, total_users_generated, next_auto_generation)
    VALUES (1, CASE WHEN is_auto_generation THEN 0 ELSE 1 END, now() + interval '3 hours');
  ELSE
    -- Update existing record
    UPDATE generation_stats 
    SET 
      total_games_generated = total_games_generated + 1,
      total_users_generated = CASE 
        WHEN is_auto_generation THEN total_users_generated 
        ELSE total_users_generated + 1 
      END,
      last_auto_generation = CASE 
        WHEN is_auto_generation THEN now() 
        ELSE last_auto_generation 
      END,
      next_auto_generation = CASE 
        WHEN is_auto_generation THEN now() + interval '3 hours'
        ELSE next_auto_generation 
      END,
      updated_at = now()
    WHERE id = stats_record.id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats when games are created
CREATE OR REPLACE FUNCTION trigger_update_generation_stats()
RETURNS trigger AS $$
BEGIN
  -- Check if this is an auto-generated game (you can add a flag to games table if needed)
  PERFORM update_generation_stats(false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on games table
DROP TRIGGER IF EXISTS update_generation_stats_trigger ON games;
CREATE TRIGGER update_generation_stats_trigger
  AFTER INSERT ON games
  FOR EACH ROW EXECUTE FUNCTION trigger_update_generation_stats();

-- Update the updated_at column trigger for generation_stats
CREATE TRIGGER update_generation_stats_updated_at 
    BEFORE UPDATE ON generation_stats 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();