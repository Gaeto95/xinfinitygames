import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export function MusicButton() {
  const [isMuted, setIsMuted] = useState(true);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleCanPlay = () => {
      setAudioLoaded(true);
      console.log('Background music loaded successfully');
    };

    const handleError = () => {
      console.log('Background music file not found - button will still be visible');
      setAudioLoaded(false);
    };

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', () => {
      console.log('Attempting to load background music...');
    });

    return () => {
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  // Auto-start music on first user interaction
  useEffect(() => {
    if (!audioLoaded || hasInteracted) return;

    const startMusicOnInteraction = () => {
      const audio = audioRef.current;
      if (audio && audioLoaded) {
        audio.play().then(() => {
          setIsMuted(false);
          setHasInteracted(true);
          console.log('Background music started automatically');
        }).catch((error) => {
          console.log('Auto-play failed (browser policy):', error);
          setHasInteracted(true);
        });
      }
    };

    // Listen for any user interaction
    const interactionEvents = ['click', 'keydown', 'touchstart', 'mousemove'];
    
    interactionEvents.forEach(event => {
      document.addEventListener(event, startMusicOnInteraction, { once: true });
    });

    return () => {
      interactionEvents.forEach(event => {
        document.removeEventListener(event, startMusicOnInteraction);
      });
    };
  }, [audioLoaded, hasInteracted]);

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio || !audioLoaded) {
      console.log('Audio not available - please add background-music.mp3 to public folder');
      return;
    }

    setHasInteracted(true);

    if (isMuted) {
      audio.play().catch((error) => {
        console.log('Failed to play audio:', error);
      });
      setIsMuted(false);
    } else {
      audio.pause();
      setIsMuted(true);
    }
  };

  return (
    <>
      <audio
        ref={audioRef}
        loop
        preload="auto"
        src="/background-music.mp3"
      />
      
      <button
        onClick={toggleMute}
        className={`bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-xl p-3 transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-cyan-500/25 ${
          audioLoaded 
            ? 'hover:bg-gray-800/80' 
            : 'opacity-50 cursor-not-allowed hover:bg-gray-900/80'
        }`}
        title={
          !audioLoaded 
            ? 'Music not available - add background-music.mp3 to public folder'
            : isMuted 
              ? 'Unmute music' 
              : 'Mute music'
        }
      >
        {isMuted || !audioLoaded ? (
          <VolumeX className="w-6 h-6 text-gray-400" />
        ) : (
          <Volume2 className="w-6 h-6 text-cyan-400" />
        )}
      </button>
    </>
  );
}