import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { supabase, Game } from '../lib/supabase';

interface VotingButtonsProps {
  game: Game;
  onVoteUpdate?: (newScore: number, newCount: number) => void;
}

export function VotingButtons({ game, onVoteUpdate }: VotingButtonsProps) {
  const [userVote, setUserVote] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [voteScore, setVoteScore] = useState(game.vote_score || 0);
  const [voteCount, setVoteCount] = useState(game.vote_count || 0);

  useEffect(() => {
    checkUserVote();
    
    // Set up real-time subscription for vote updates
    const subscription = supabase
      .channel(`game-votes-${game.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${game.id}`
        },
        (payload) => {
          console.log('Real-time vote update:', payload);
          if (payload.new && typeof payload.new === 'object') {
            const newGame = payload.new as Game;
            setVoteScore(newGame.vote_score || 0);
            setVoteCount(newGame.vote_count || 0);
            
            if (onVoteUpdate) {
              onVoteUpdate(newGame.vote_score || 0, newGame.vote_count || 0);
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [game.id, onVoteUpdate]);

  // Update local state when game prop changes
  useEffect(() => {
    setVoteScore(game.vote_score || 0);
    setVoteCount(game.vote_count || 0);
  }, [game.vote_score, game.vote_count]);

  const checkUserVote = async () => {
    try {
      const ipHash = await getIpHash();
      const { data, error } = await supabase
        .from('game_votes')
        .select('vote')
        .eq('game_id', game.id)
        .eq('ip_hash', ipHash)
        .maybeSingle();

      if (error) {
        console.error('Error checking user vote:', error);
        return;
      }

      setUserVote(data?.vote || null);
    } catch (error) {
      console.error('Error checking user vote:', error);
    }
  };

  const getIpHash = async (): Promise<string> => {
    try {
      // Get user's IP address
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      const ip = data.ip;
      
      // Create a simple hash (in production, this should be done server-side)
      const encoder = new TextEncoder();
      const data_encoded = encoder.encode(ip + 'salt_for_privacy');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data_encoded);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('Error getting IP hash:', error);
      // Fallback to a random hash for this session
      return Math.random().toString(36).substring(2, 15);
    }
  };

  const handleVote = async (voteValue: number) => {
    if (isVoting) return;
    
    setIsVoting(true);
    try {
      const ipHash = await getIpHash();
      
      if (userVote === voteValue) {
        // Remove vote if clicking the same button
        const { error } = await supabase
          .from('game_votes')
          .delete()
          .eq('game_id', game.id)
          .eq('ip_hash', ipHash);

        if (error) throw error;
        setUserVote(null);
      } else {
        // Add or update vote
        const { error } = await supabase
          .from('game_votes')
          .upsert({
            game_id: game.id,
            ip_hash: ipHash,
            vote: voteValue
          }, {
            onConflict: 'game_id,ip_hash'
          });

        if (error) throw error;
        setUserVote(voteValue);
      }

      // The real-time subscription will handle updating the UI
      // But we can also fetch immediately for instant feedback
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('vote_score, vote_count')
        .eq('id', game.id)
        .single();

      if (gameError) throw gameError;

      setVoteScore(gameData.vote_score || 0);
      setVoteCount(gameData.vote_count || 0);
      
      if (onVoteUpdate) {
        onVoteUpdate(gameData.vote_score || 0, gameData.vote_count || 0);
      }

    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => handleVote(1)}
        disabled={isVoting}
        className={`flex items-center space-x-1 px-3 py-1 rounded-lg transition-all duration-200 ${
          userVote === 1
            ? 'bg-green-500 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-green-500/20 hover:text-green-400'
        } disabled:opacity-50`}
      >
        <ThumbsUp className="w-4 h-4" />
        <span className="text-sm font-medium">
          {voteScore > 0 ? `+${voteScore}` : voteScore}
        </span>
      </button>
      
      <button
        onClick={() => handleVote(-1)}
        disabled={isVoting}
        className={`flex items-center space-x-1 px-3 py-1 rounded-lg transition-all duration-200 ${
          userVote === -1
            ? 'bg-red-500 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-red-500/20 hover:text-red-400'
        } disabled:opacity-50`}
      >
        <ThumbsDown className="w-4 h-4" />
      </button>
      
      {voteCount > 0 && (
        <span className="text-xs text-gray-500">
          {voteCount} vote{voteCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}