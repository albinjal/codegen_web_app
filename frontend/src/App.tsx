import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import ProjectPage from './pages/ProjectPage';
import './index.css'; // Assuming your global styles are here

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="p-4 border-b">
        <Link to="/" className="text-xl font-bold hover:text-primary mr-4">Home</Link>
        {/* Add other global navigation links if needed */}
      </nav>
      <main className="p-4">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/project/:projectId" element={<ProjectPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
