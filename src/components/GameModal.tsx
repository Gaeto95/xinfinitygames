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
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50">
          <h2 className="text-xl font-bold text-white">{game.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors duration-200 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="bg-white" style={{ height: '60vh' }}>
          <iframe
            srcDoc={game.code}
            className="w-full h-full border-0"
            title={game.title}
            sandbox="allow-scripts allow-same-origin allow-forms"
            style={{ minHeight: '400px' }}
          />
        </div>
        
        <div className="p-4 bg-gray-800/50">
          <p className="text-gray-300 text-sm">{game.prompt}</p>
        </div>
      </div>
    </div>
  );
}