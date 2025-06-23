import React from 'react';

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-gray-700 border-t-cyan-500 rounded-full animate-spin" />
        <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-b-purple-500 rounded-full animate-spin animation-delay-150" />
      </div>
    </div>
  );
}