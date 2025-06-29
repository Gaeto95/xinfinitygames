import React from 'react';
import { X } from 'lucide-react';
import { Game } from '../lib/supabase';

interface GameModalProps {
  game: Game | null;
  onClose: () => void;
}

export function GameModal({ game, onClose }: GameModalProps) {
  if (!game) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden w-full h-full max-w-7xl max-h-[95vh] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50 flex-shrink-0">
          <h2 className="text-xl font-bold text-white truncate pr-4">{game.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors duration-200 text-gray-400 hover:text-white flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Game Container */}
        <div className="flex-1 bg-white overflow-hidden">
          <iframe
            srcDoc={game.code}
            className="w-full h-full border-0"
            title={game.title}
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        </div>
        
        {/* Footer with description */}
        <div className="p-4 bg-gray-800/50 border-t border-gray-700 flex-shrink-0">
          <p className="text-gray-300 text-sm leading-relaxed">{game.prompt}</p>
        </div>
      </div>
    </div>
  );
}