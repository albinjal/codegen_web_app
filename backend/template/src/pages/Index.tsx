// Update this page (the content is just a fallback if you fail to update the page)

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-yellow-400/5 relative">
      {/* Tinted overlay */}
      <div className="absolute inset-0 bg-muted/20" />

      {/* Loading content */}
      <div className="relative z-10 text-center space-y-6 max-w-md mx-auto px-8">
        {/* Animated Russable logo */}
        <div className="relative">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black h-20 w-20 rounded-xl flex items-center justify-center text-3xl font-bold mx-auto animate-pulse shadow-2xl">
            R
          </div>
          <div className="absolute inset-0 border-2 border-yellow-400/30 rounded-xl animate-pulse" />
        </div>

        {/* Loading message */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Building Your App...
          </h1>
          <p className="text-lg text-muted-foreground">
            This guy's AI is working some fucking magic! 🚗💨
          </p>
        </div>

        {/* Loading dots */}
        <div className="flex justify-center space-x-1">
          <div className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>

        {/* Status message */}
        <div className="bg-gradient-to-r from-yellow-400/10 to-orange-500/10 border border-yellow-400/20 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            Crafting your billion-dollar idea into reality...
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
