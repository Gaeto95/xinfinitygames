import React, { useState } from 'react';
import { X, Sparkles, Wand2 } from 'lucide-react';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => void;
  isGenerating: boolean;
}

export function PromptModal({ isOpen, onClose, onSubmit, isGenerating }: PromptModalProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedExample, setSelectedExample] = useState<string | null>(null);

  const examplePrompts = [
    "A space shooter where you're a pizza delivery driver fighting alien customers",
    "A puzzle game about organizing a chaotic digital desktop",
    "A platformer where gravity changes based on your emotions",
    "A racing game through a world made entirely of food",
    "A rhythm game where you conduct an orchestra of robots",
    "A tower defense game protecting a garden from office supplies",
    "A stealth game where you're a cat burglar... who's actually a cat",
    "A fishing game in a cyberpunk city's data streams"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() || selectedExample) {
      onSubmit(selectedExample || prompt.trim());
      setPrompt('');
      setSelectedExample(null);
    }
  };

  const handleExampleClick = (example: string) => {
    setSelectedExample(example);
    setPrompt(example);
  };

  const handleRandomPrompt = () => {
    const randomExample = examplePrompts[Math.floor(Math.random() * examplePrompts.length)];
    setPrompt(randomExample);
    setSelectedExample(randomExample);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-gradient-to-br from-gray-900 via-purple-900/50 to-cyan-900/50 border border-gray-700 rounded-3xl p-8 max-w-2xl w-full shadow-2xl">
        {/* Animated background */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 animate-pulse" />
          <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-cyan-400/20 rounded-full blur-2xl animate-bounce" />
          <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-purple-400/20 rounded-full blur-2xl animate-bounce animation-delay-150" />
        </div>
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-lg">
                <Wand2 className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Describe Your Game</h2>
                <p className="text-gray-300 text-sm">Tell the AI what kind of game you want to create</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors duration-200 text-gray-400 hover:text-white disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Prompt Input */}
            <div>
              <label htmlFor="gamePrompt" className="block text-sm font-medium text-gray-200 mb-3">
                Game Description
              </label>
              <textarea
                id="gamePrompt"
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setSelectedExample(null);
                }}
                placeholder="Describe the game you want to create... Be creative! The weirder, the better!"
                className="w-full h-32 px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                disabled={isGenerating}
              />
            </div>

            {/* Random Prompt Button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleRandomPrompt}
                disabled={isGenerating}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 rounded-lg text-gray-300 hover:text-white transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Surprise Me!</span>
              </button>
            </div>

            {/* Example Prompts */}
            <div>
              <h3 className="text-sm font-medium text-gray-200 mb-3">Or choose an example:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {examplePrompts.map((example, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleExampleClick(example)}
                    disabled={isGenerating}
                    className={`p-3 text-left text-sm rounded-lg border transition-all duration-200 disabled:opacity-50 ${
                      selectedExample === example
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                        : 'bg-gray-800/30 border-gray-600/50 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500'
                    }`}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
              <button
                type="button"
                onClick={onClose}
                disabled={isGenerating}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => onSubmit('')}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-xl transition-colors disabled:opacity-50"
                >
                  Surprise Me
                </button>
                <button
                  type="submit"
                  disabled={isGenerating || (!prompt.trim() && !selectedExample)}
                  className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      <span>Generate Game</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Tips */}
          <div className="mt-6 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
            <h4 className="text-sm font-medium text-cyan-400 mb-2">💡 Tips for better games:</h4>
            <ul className="text-xs text-gray-300 space-y-1">
              <li>• Be specific about gameplay mechanics (jumping, shooting, collecting, etc.)</li>
              <li>• Mention the setting or theme (space, underwater, medieval, etc.)</li>
              <li>• Include what makes it unique or weird</li>
              <li>• Keep it simple - the AI works best with focused concepts</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}