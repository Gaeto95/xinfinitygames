import React, { useEffect, useState } from 'react';
import { Bot, Sparkles, Zap, Gamepad2, Palette, Code } from 'lucide-react';

interface GenerationModalProps {
  isOpen: boolean;
  stage: string;
}

const stages = [
  { 
    id: 'thinking', 
    icon: Bot, 
    title: 'AI is contemplating existence...', 
    subtitle: 'Pondering the meaning of fun and chaos',
    duration: 8
  },
  { 
    id: 'idea', 
    icon: Sparkles, 
    title: 'Brainstorming wild concepts...', 
    subtitle: 'What if gravity worked sideways?',
    duration: 10
  },
  { 
    id: 'art', 
    icon: Palette, 
    title: 'Painting pixels with pure imagination...', 
    subtitle: 'Teaching AI what "pretty chaos" looks like',
    duration: 12
  },
  { 
    id: 'coding', 
    icon: Code, 
    title: 'Frantically typing with robot fingers...', 
    subtitle: 'Converting madness into playable reality',
    duration: 15
  },
  { 
    id: 'magic', 
    icon: Zap, 
    title: 'Sprinkling digital fairy dust...', 
    subtitle: 'Adding the secret sauce of weirdness',
    duration: 5
  },
  { 
    id: 'final', 
    icon: Gamepad2, 
    title: 'Birthing your new digital pet...', 
    subtitle: 'Almost ready to cause delightful chaos',
    duration: 3
  }
];

export function GenerationModal({ isOpen, stage }: GenerationModalProps) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStageIndex(0);
      setProgress(0);
      setTimeElapsed(0);
      return;
    }

    // Auto-advance through stages based on realistic timing
    const timer = setInterval(() => {
      setTimeElapsed(prev => {
        const newTime = prev + 1;
        
        // Calculate which stage we should be in based on elapsed time
        let totalTime = 0;
        let newStageIndex = 0;
        
        for (let i = 0; i < stages.length; i++) {
          totalTime += stages[i].duration;
          if (newTime <= totalTime) {
            newStageIndex = i;
            break;
          }
        }
        
        // If we've exceeded all stages, stay at the last one
        if (newTime > totalTime) {
          newStageIndex = stages.length - 1;
        }
        
        setCurrentStageIndex(newStageIndex);
        
        // Calculate progress within current stage
        const stageStartTime = stages.slice(0, newStageIndex).reduce((sum, s) => sum + s.duration, 0);
        const stageProgress = Math.min((newTime - stageStartTime) / stages[newStageIndex].duration, 1);
        
        // Calculate overall progress
        const overallProgress = Math.min((newTime / totalTime) * 100, 95); // Cap at 95% until completion
        setProgress(overallProgress);
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentStage = stages[currentStageIndex];
  const Icon = currentStage.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      <div className="relative bg-gradient-to-br from-gray-900 via-purple-900/50 to-cyan-900/50 border border-gray-700 rounded-3xl p-8 max-w-md w-full shadow-2xl">
        {/* Animated background */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 animate-pulse" />
          <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-cyan-400/20 rounded-full blur-2xl animate-bounce" />
          <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-purple-400/20 rounded-full blur-2xl animate-bounce animation-delay-150" />
        </div>
        
        <div className="relative z-10 text-center">
          {/* Icon */}
          <div className="mb-6">
            <div className="relative inline-block">
              <div className="w-20 h-20 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl flex items-center justify-center animate-pulse">
                <Icon className="w-10 h-10 text-white" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl blur-xl opacity-50 animate-ping" />
            </div>
          </div>
          
          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-2">
            {currentStage.title}
          </h2>
          
          {/* Subtitle */}
          <p className="text-gray-300 mb-8">
            {currentStage.subtitle}
          </p>
          
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-1000 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
              </div>
            </div>
          </div>
          
          {/* Stage indicators */}
          <div className="flex justify-center space-x-2 mb-6">
            {stages.map((s, index) => {
              const StageIcon = s.icon;
              return (
                <div
                  key={s.id}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    index < currentStageIndex
                      ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white scale-110'
                      : index === currentStageIndex
                        ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white scale-125 animate-pulse'
                        : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  <StageIcon className="w-4 h-4" />
                </div>
              );
            })}
          </div>
          
          {/* Time estimate */}
          <div className="text-sm text-gray-400 mb-4">
            <div className="flex items-center justify-center space-x-2">
              <span>Time elapsed:</span>
              <span className="text-cyan-400 font-mono">{timeElapsed}s</span>
            </div>
          </div>
          
          {/* Fun loading text */}
          <div className="text-sm text-gray-400">
            <div className="flex items-center justify-center space-x-1">
              <span>AI is working hard</span>
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce" />
                <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce animation-delay-150" />
                <div className="w-1 h-1 bg-pink-400 rounded-full animate-bounce animation-delay-300" />
              </div>
              <span>creating magic</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}