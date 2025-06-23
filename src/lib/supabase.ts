import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);

export interface Game {
  id: string;
  title: string;
  prompt: string;
  code: string;
  thumbnail_url: string;
  status: 'pending' | 'approved';
  created_at: string;
  updated_at: string;
  vote_score?: number;
  vote_count?: number;
}

export interface GameVote {
  id: string;
  game_id: string;
  ip_hash: string;
  vote: number;
  created_at: string;
}