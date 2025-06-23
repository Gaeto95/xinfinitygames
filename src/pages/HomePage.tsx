import React, { useState, useEffect } from 'react';
import { Zap, Gamepad2, Sparkles, TrendingUp, Clock } from 'lucide-react';
import { supabase, Game } from '../lib/supabase';
import { GameCard } from '../components/GameCard';
import { GameModal } from '../components/GameModal';
import { GenerationModal } from '../components/GenerationModal';
import { PromptModal } from '../components/PromptModal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StatsPanel } from '../components/StatsPanel';

export function HomePage() {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState('thinking');
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');
  const [showPromptModal, setShowPromptModal] = useState(false);

  useEffect(() => {
    fetchGames();
  }, [sortBy]);

  const fetchGames = async () => {
    try {
      let query = supabase
        .from('games')
        .select('*')
        .eq('status', 'approved');

      if (sortBy === 'popular') {
        query = query.order('vote_score', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      setGames(data || []);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVoteUpdate = (gameId: string, newScore: number, newCount: number) => {
    setGames(prevGames => 
      prevGames.map(game => 
        game.id === gameId 
          ? { ...game, vote_score: newScore, vote_count: newCount }
          : game
      )
    );
  };

  const handleGenerateClick = () => {
    setShowPromptModal(true);
  };

  const generateNewGame = async (userPrompt: string = '') => {
    setShowPromptModal(false);
    setGenerating(true);
    setGenerationStage('thinking');
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      console.log('Environment check:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'missing'
      });
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase configuration. Please check your .env file contains VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
      }

      const functionUrl = `${supabaseUrl}/functions/v1/generate-game`;
      console.log('Starting game generation with prompt:', userPrompt || 'No prompt (surprise me)');
      
      // Start the API call immediately - no fake delays
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          user_prompt: userPrompt.trim() || null 
        }),
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(120000) // 2 minutes timeout
      });

      console.log('Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge function error response:', errorText);
        
        // Provide more specific error messages
        if (response.status === 404) {
          throw new Error('Edge function not found. Please ensure the generate-game function is deployed to Supabase.');
        } else if (response.status === 500) {
          throw new Error(`Server error: ${errorText}. Check the edge function logs in your Supabase dashboard.`);
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication error. Please check your Supabase keys and permissions.');
        } else {
          throw new Error(`Failed to generate game (${response.status}): ${errorText}`);
        }
      }

      const responseText = await response.text();
      console.log('Response text:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        throw new Error(`Invalid response format from edge function: ${responseText.substring(0, 200)}...`);
      }

      console.log('Generated game:', result);
      
      await fetchGames();
    } catch (error) {
      console.error('Error generating game:', error);
      
      // Provide user-friendly error messages
      let userMessage = 'Error generating game: ';
      
      if (error.name === 'AbortError') {
        userMessage += 'Request timed out. The AI might be busy - please try again.';
      } else if (error.message.includes('Failed to fetch')) {
        userMessage += 'Network error. Please check your internet connection and Supabase configuration.';
      } else {
        userMessage += error.message;
      }
      
      alert(userMessage);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl">
                <Gamepad2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  xinfinitygames
                </h1>
                <p className="text-gray-400 text-sm">Autonomous Mini-Game Generator</p>
              </div>
            </div>
            
            <button
              onClick={handleGenerateClick}
              disabled={generating}
              className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25"
            >
              {generating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>Generate Game</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section with Stats Panel */}
      <section className="py-20 px-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse animation-delay-150"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl animate-pulse"></div>
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left side - Hero Content */}
            <div className="lg:col-span-2 text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 bg-gray-800/80 backdrop-blur-sm px-4 py-2 rounded-full mb-8 border border-gray-700/50">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-gray-200 text-sm font-medium">AI-Powered Game Creation</span>
              </div>
              
              <h2 className="text-5xl md:text-7xl font-bold mb-6">
                <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Infinite
                </span>
                <br />
                <span className="text-white drop-shadow-lg">Possibilities</span>
              </h2>
              
              <p className="text-xl text-gray-200 mb-12 max-w-2xl mx-auto lg:mx-0 leading-relaxed drop-shadow-sm">
                Experience weird, funny, and chaotic browser mini-games generated completely by AI. 
                Each game is unique, unexpected, and ready to play instantly.
              </p>
            </div>

            {/* Right side - Compact Stats Panel */}
            <div className="lg:col-span-1 flex justify-center lg:justify-end">
              <div className="w-full max-w-sm">
                <StatsPanel />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Games Grid */}
      <section className="pb-20 px-4 bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-3xl font-bold text-white">Game Library</h3>
            
            <div className="flex items-center space-x-4">
              <div className="text-gray-400 text-sm">
                {games.length} games available
              </div>
              
              <div className="flex bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setSortBy('newest')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    sortBy === 'newest'
                      ? 'bg-cyan-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Newest</span>
                </button>
                <button
                  onClick={() => setSortBy('popular')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    sortBy === 'popular'
                      ? 'bg-cyan-500 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Popular</span>
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : games.length === 0 ? (
            <div className="text-center py-20">
              <div className="relative mb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl mx-auto flex items-center justify-center">
                  <Gamepad2 className="w-12 h-12 text-gray-400" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-2xl blur-xl"></div>
              </div>
              <h3 className="text-2xl font-bold text-gray-300 mb-4">No games yet</h3>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                Click "Generate Game" to create the first AI-powered mini-game and start building your infinite arcade!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {games.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onPlay={setSelectedGame}
                  onVoteUpdate={handleVoteUpdate}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Game Modal */}
      <GameModal
        game={selectedGame}
        onClose={() => setSelectedGame(null)}
      />

      {/* Prompt Modal */}
      <PromptModal
        isOpen={showPromptModal}
        onClose={() => setShowPromptModal(false)}
        onSubmit={generateNewGame}
        isGenerating={generating}
      />

      {/* Generation Modal */}
      <GenerationModal
        isOpen={generating}
        stage={generationStage}
      />
    </div>
  );
}