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
    "Analyzing your request...",
    "Generating code structure...",
    "Creating components...",
    "Setting up styling...",
    "Optimizing performance...",
    "Almost ready..."
  ];

  const aiProcessingTexts = [
    "AI is thinking...",
    "Processing your request...",
    "Generating response...",
    "Crafting the perfect solution...",
    "Putting finishing touches...",
    "Ready to deliver!"
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
    <div className="fixed inset-0 bg-gradient-to-br from-background via-background/98 to-primary/3 flex items-center justify-center overflow-hidden z-50">
      {/* Main loading content */}
      <div className="relative z-10 text-center space-y-6 max-w-md mx-auto px-6">
        {/* Animated logo */}
        <div className="relative">
          <div className="bg-primary text-primary-foreground h-16 w-16 rounded-xl flex items-center justify-center text-2xl font-bold mx-auto animate-pulse-scale shadow-xl">
            A
          </div>

          {/* Rotating ring around logo */}
          <div className="absolute inset-0 border-3 border-primary/20 rounded-xl animate-spin-slow" />
          <div className="absolute inset-1 border-2 border-primary/10 rounded-lg animate-spin-reverse" />
        </div>

        {/* Loading text */}
        <div className="space-y-2">
          <div className="h-6">
            <p className="text-lg font-medium text-foreground animate-typewriter">
              {loadingTexts[currentText]}
            </p>
          </div>

          {!loadingText && (
            <p className="text-sm text-muted-foreground">
              This may take a moment...
            </p>
          )}
        </div>

        {/* Loading dots */}
        <div className="flex justify-center space-x-1">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>

      {/* Bottom decoration */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground/40 animate-fade-in-delay-2">
        Powered by Claude AI
      </div>
    </div>
  );
};

export default LoadingScreen;
