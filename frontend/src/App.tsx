import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ProjectPage from './pages/ProjectPage';
import { Toaster } from './components/ui/toaster';
import './index.css'; // Assuming your global styles are here

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-primary text-primary-foreground h-8 w-8 rounded-md flex items-center justify-center text-lg font-bold">
              A
            </div>
            <span className="font-bold text-xl">AI Code Generator</span>
          </Link>

          <nav className="flex items-center space-x-4">
            <Link
              to="/"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Projects
            </Link>
            <a
              href="https://github.com/albinjal/codegen_web_app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/project/:projectId" element={<ProjectPage />} />
        </Routes>
      </main>

      <footer className="border-t py-4 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-4">
          <p>AI Code Generator - Build web applications using AI</p>
        </div>
      </footer>

      <Toaster />
    </div>
  );
};

export default App;
