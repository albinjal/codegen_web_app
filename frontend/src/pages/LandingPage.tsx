import React from 'react';

const LandingPage: React.FC = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Codegen Web App</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Create a new project</h2>
          <div className="border p-4 rounded-lg shadow-sm">
            <textarea
              className="w-full border rounded p-2 min-h-[150px]"
              placeholder="Describe the website you want to generate..."
            />
            <button className="mt-3 bg-primary text-primary-foreground px-4 py-2 rounded">
              Generate Website
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Your projects</h2>
          <div className="border p-4 rounded-lg shadow-sm">
            <p className="text-muted-foreground">No projects yet</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
