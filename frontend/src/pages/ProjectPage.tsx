import React from 'react';
import { useParams } from 'react-router-dom';

const ProjectPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Project</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="flex flex-col h-full">
          <div className="flex-grow border rounded-lg shadow-sm p-4 mb-4 overflow-y-auto min-h-[300px] max-h-[500px]">
            <div className="space-y-4">
              {/* Chat history will go here */}
              <div className="bg-secondary p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">You</p>
                <p>Create a simple website about cats</p>
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">Assistant</p>
                <p>I'll create a simple website about cats for you...</p>
              </div>
            </div>
          </div>

          <div className="border rounded-lg shadow-sm p-4">
            <textarea
              className="w-full border rounded p-2 min-h-[80px]"
              placeholder="Send a message..."
            />
            <button className="mt-3 bg-primary text-primary-foreground px-4 py-2 rounded">
              Send
            </button>
          </div>
        </div>

        <div className="border rounded-lg shadow-sm overflow-hidden h-[600px]">
          <div className="bg-muted p-2 text-sm flex items-center justify-between">
            <span>Preview</span>
            <span className="text-muted-foreground">Project ID: {id}</span>
          </div>
          <iframe
            src={`/preview/${id}/index.html`}
            className="w-full h-full border-0"
            title="Website Preview"
          />
        </div>
      </div>
    </div>
  );
};

export default ProjectPage;
