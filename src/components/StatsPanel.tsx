import React, { useState, useEffect } from 'react';
import { Bot, Users, Clock, Zap, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface GenerationStats {
  id: string;
  total_games_generated: number;
  total_users_generated: number;
  last_auto_generation: string | null;
  next_auto_generation: string;
  created_at: string;
  updated_at: string;
}

export function StatsPanel() {
  const [stats, setStats] = useState<GenerationStats | null>(null);
  const [timeUntilNext, setTimeUntilNext] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (stats?.next_auto_generation) {
      const timer = setInterval(updateCountdown, 1000);
      return () => clearInterval(timer);
    }
  }, [stats?.next_auto_generation]);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('generation_stats')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching stats:', error);
        return;
      }

      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCountdown = () => {
    if (!stats?.next_auto_generation) return;

    const now = new Date().getTime();
    const nextGen = new Date(stats.next_auto_generation).getTime();
    const difference = nextGen - now;

    if (difference > 0) {
      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeUntilNext(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    } else {
      setTimeUntilNext('Generating now...');
      // Refresh stats when time is up
      setTimeout(fetchStats, 2000);
    }
  };

  const triggerAutoGeneration = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase configuration');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/auto-generate-game`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Auto-generation triggered successfully');
        fetchStats(); // Refresh stats
      } else {
        console.log('Auto-generation response:', result.message);
      }
    } catch (error) {
      console.error('Error triggering auto-generation:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-600 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-600 rounded"></div>
            <div className="h-4 bg-gray-600 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
        <div className="text-center text-gray-400">
          <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-base">Statistics unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 shadow-xl">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-lg">
          <TrendingUp className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Generation Statistics</h3>
          <p className="text-gray-400 text-sm">AI-powered game creation metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Total Games */}
        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50">
          <div className="text-center">
            <div className="p-2 bg-cyan-500/20 rounded-lg mx-auto w-fit mb-2">
              <Bot className="w-5 h-5 text-cyan-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.total_games_generated}</p>
            <p className="text-gray-400 text-sm">Games</p>
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50">
          <div className="text-center">
            <div className="p-2 bg-purple-500/20 rounded-lg mx-auto w-fit mb-2">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">{stats.total_users_generated}</p>
            <p className="text-gray-400 text-sm">Users</p>
          </div>
        </div>

        {/* Auto Generations */}
        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50">
          <div className="text-center">
            <div className="p-2 bg-green-500/20 rounded-lg mx-auto w-fit mb-2">
              <Zap className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {stats.total_games_generated - stats.total_users_generated}
            </p>
            <p className="text-gray-400 text-sm">Auto</p>
          </div>
        </div>
      </div>

      {/* Next Auto Generation */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-lg p-4 border border-cyan-500/20 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-base">Next Auto-Generation</p>
              <p className="text-gray-300 text-sm">AI creates a new game every 3 hours</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-mono font-bold text-cyan-400">
              {timeUntilNext || 'Loading...'}
            </p>
            <p className="text-gray-400 text-sm">HH:MM:SS</p>
          </div>
        </div>
      </div>

      {/* Last Generation Info */}
      {stats.last_auto_generation && (
        <div className="mb-4 pt-4 border-t border-gray-700/50">
          <p className="text-gray-400 text-sm">
            Last auto-generation: {new Date(stats.last_auto_generation).toLocaleString()}
          </p>
        </div>
      )}

      {/* Debug: Manual trigger button (remove in production) */}
      <div className="pt-4 border-t border-gray-700/50">
        <button
          onClick={triggerAutoGeneration}
          className="w-full px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 rounded-lg text-gray-300 text-sm transition-colors"
        >
          🔧 Trigger Auto-Generation (Debug)
        </button>
      </div>
    </div>
  );
}