/*
  # Wipe Database Tables

  This migration cleans all data from the game-related tables while preserving the schema structure.

  ## What this does:
  1. Deletes all games and their associated votes
  2. Resets generation statistics
  3. Preserves all table structures, policies, and functions
  4. Gives you a fresh start with clean data

  ## Tables affected:
  - `games` - All game records deleted
  - `game_votes` - All vote records deleted  
  - `generation_stats` - Reset to initial state

  ## What's preserved:
  - All table schemas
  - All RLS policies
  - All functions and triggers
  - All indexes and constraints
*/

-- Delete all votes first (due to foreign key constraints)
DELETE FROM game_votes;

-- Delete all games
DELETE FROM games;

-- Reset generation stats to initial state
DELETE FROM generation_stats;

-- Insert fresh generation stats record
INSERT INTO generation_stats (
  total_games_generated,
  total_users_generated,
  last_auto_generation,
  next_auto_generation
) VALUES (
  0,
  0,
  NULL,
  now() + interval '3 hours'
);