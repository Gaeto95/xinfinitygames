import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { MusicPlayer } from './components/MusicPlayer';

function App() {
  return (
    <Router>
      <div className="min-h-screen relative">
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
        
        {/* Background Music Player */}
        <MusicPlayer />
        
        {/* Made by Bolt overlay */}
        <div className="fixed bottom-4 left-4 z-50">
          <a 
            href="https://bolt.new" 
            target="_blank" 
            rel="noopener noreferrer"
            className="block transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-cyan-500/25"
          >
            <img 
              src="/made-by-bolt.png" 
              alt="Made by Bolt" 
              className="w-36 h-36 opacity-80 hover:opacity-100 transition-opacity duration-300"
            />
          </a>
        </div>
      </div>
    </Router>
  );
}

export default App;