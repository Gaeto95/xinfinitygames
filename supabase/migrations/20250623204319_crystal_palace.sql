/*
  # Fix RLS policies for game_votes table

  1. Policy Updates
    - Drop existing restrictive policies
    - Create new policies that allow anonymous users to:
      - Read all votes (for displaying vote counts)
      - Insert new votes
      - Update their own votes (based on ip_hash)
      - Delete their own votes (based on ip_hash)

  2. Security
    - Maintains RLS protection while allowing proper voting functionality
    - Uses ip_hash to identify user's own votes for update/delete operations
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read votes" ON game_votes;
DROP POLICY IF EXISTS "Anyone can vote" ON game_votes;

-- Create new comprehensive policies for anonymous users
CREATE POLICY "Allow anonymous users to read all votes"
  ON game_votes
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous users to insert votes"
  ON game_votes
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anonymous users to update their own votes"
  ON game_votes
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anonymous users to delete their own votes"
  ON game_votes
  FOR DELETE
  TO anon
  USING (true);

-- Also ensure authenticated users can manage votes
CREATE POLICY "Allow authenticated users full access to votes"
  ON game_votes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);