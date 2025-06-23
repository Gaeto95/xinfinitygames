import React from 'react';
import { Play, Calendar } from 'lucide-react';
import { Game } from '../lib/supabase';
import { VotingButtons } from './VotingButtons';

interface GameCardProps {
  game: Game;
  onPlay: (game: Game) => void;
  onVoteUpdate?: (gameId: string, newScore: number, newCount: number) => void;
}

export function GameCard({ game, onPlay, onVoteUpdate }: GameCardProps) {
  const handleVoteUpdate = (newScore: number, newCount: number) => {
    if (onVoteUpdate) {
      onVoteUpdate(game.id, newScore, newCount);
    }
  };

  return (
    <div className="group bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/20">
      <div className="aspect-video bg-gradient-to-br from-purple-900/50 to-cyan-900/50 relative overflow-hidden">
        <img 
          src={game.thumbnail_url} 
          alt={game.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = '/placeholder.png';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <button
          onClick={() => onPlay(game)}
          className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-all duration-300"
        >
          <div className="bg-cyan-500 rounded-full p-4 transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-8 h-8 text-black fill-current ml-1" />
          </div>
        </button>
      </div>
      
      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors duration-300">
          {game.title}
        </h3>
        <p className="text-gray-400 text-sm leading-relaxed line-clamp-3 mb-4">
          {game.prompt}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>{new Date(game.created_at).toLocaleDateString()}</span>
          </div>
          
          <VotingButtons 
            game={game} 
            onVoteUpdate={handleVoteUpdate}
          />
        </div>
      </div>
    </div>
  );
}