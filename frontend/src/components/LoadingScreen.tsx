import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onLoadingComplete?: () => void;
  loadingText?: string;
  duration?: number; // in milliseconds, optional
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  onLoadingComplete,
  loadingText,
  duration
}) => {
  const [currentText, setCurrentText] = useState(0);

  const defaultLoadingTexts = [
    "Analyzing your billion-dollar idea...",
    "Generating code that fucks...",
    "Creating components like a boss...",
    "Setting up styling that's flashier than my McLaren...",
    "Optimizing performance for maximum ROI...",
    "Almost ready to make you rich!"
  ];

  const aiProcessingTexts = [
    "This guy's AI is thinking...",
    "Processing your request like a Three Comma Club member...",
    "Generating response with billionaire precision...",
    "Crafting the perfect fucking solution...",
    "Putting finishing touches on your empire...",
    "Ready to deliver some serious ROI!"
  ];

  const loadingTexts = loadingText ? [loadingText] : (
    duration && duration > 8000 ? defaultLoadingTexts : aiProcessingTexts
  );

  useEffect(() => {
    let completionTimeout: NodeJS.Timeout | null = null;
    let textInterval: NodeJS.Timeout | null = null;

    // Auto-complete after duration if specified
    if (duration && onLoadingComplete) {
      completionTimeout = setTimeout(() => {
        onLoadingComplete();
      }, duration);
    }

    // Text rotation (only if multiple texts)
    if (loadingTexts.length > 1) {
      textInterval = setInterval(() => {
        setCurrentText(prev => (prev + 1) % loadingTexts.length);
      }, duration ? Math.max(1600, duration / loadingTexts.length) : 2000);
    }

    return () => {
      if (completionTimeout) clearTimeout(completionTimeout);
      if (textInterval) clearInterval(textInterval);
    };
  }, [onLoadingComplete, duration, loadingTexts.length]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background via-background/98 to-yellow-400/5 flex items-center justify-center overflow-hidden z-50">
      {/* Main loading content */}
      <div className="relative z-10 text-center space-y-6 max-w-md mx-auto px-6">
        {/* Animated logo with Russ style */}
        <div className="relative">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black h-20 w-20 rounded-xl flex items-center justify-center text-3xl font-bold mx-auto animate-pulse-scale shadow-2xl">
            R
          </div>
        </div>

        {/* Loading text */}
        <div className="space-y-3">
          <div className="h-6">
            <p className="text-lg font-medium text-foreground animate-typewriter">
              {loadingTexts[currentText]}
            </p>
          </div>

          {!loadingText && (
            <p className="text-sm text-muted-foreground">
              Trust me, I know what I'm doing... 💰
            </p>
          )}
        </div>

        {/* Loading dots with Russ style */}
        <div className="flex justify-center space-x-1">
          <div className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>

        {/* Russ quote */}
        <div className="mt-6 p-4 bg-gradient-to-r from-yellow-400/10 to-orange-500/10 rounded-lg border border-yellow-400/20">
          <p className="text-sm italic text-muted-foreground">
            "ROI, baby! You know what that stands for? Radio on Internet!"
          </p>
        </div>
      </div>


    </div>
  );
};

export default LoadingScreen;
