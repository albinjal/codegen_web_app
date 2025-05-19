import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listProjects, createProjectAndConnectSse, Project } from '@/lib/ApiService'; // Corrected import path
import { Button } from '@/components/ui/button'; // Corrected import path
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'; // Corrected import path
import { Textarea } from '@/components/ui/textarea'; // Corrected import path
import { Spinner } from '@/components/ui/spinner';

// Creation steps with descriptions for visual feedback
const CREATION_STEPS = [
  { id: 'initializing', label: 'Initializing project...' },
  { id: 'analyzing', label: 'Analyzing requirements...' },
  { id: 'generating', label: 'Generating code structure...' },
  { id: 'finalizing', label: 'Preparing your project...' }
];

const LandingPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [initialPrompt, setInitialPrompt] = useState('');
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [creationStep, setCreationStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoadingProjects(true);
      try {
        const fetchedProjects = await listProjects();
        setProjects(fetchedProjects);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        // TODO: Show error to user
      }
      setIsLoadingProjects(false);
    };
    fetchProjects();
  }, []);

  // Effect to simulate progress through creation steps
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isCreatingProject && creationStep < CREATION_STEPS.length - 1) {
      timeout = setTimeout(() => {
        setCreationStep(prev => prev + 1);
      }, 2000); // Advance to next step every 1.2 seconds for the visual effect
    }
    return () => clearTimeout(timeout);
  }, [isCreatingProject, creationStep]);

  const handleCreateProject = async () => {
    if (!initialPrompt.trim()) {
      // TODO: Show error for empty prompt
      return;
    }
    setIsCreatingProject(true);
    setCreationStep(0); // Reset to first step

    try {
      // The createProjectAndConnectSse in ApiService is a bit of a placeholder for how SSE is established.
      // It *simulates* getting a projectId and then creating an EventSource.
      // The actual EventSource connection to GET /api/projects/:id/stream will be managed by ProjectPage.
      const { projectId } = await createProjectAndConnectSse(initialPrompt);

      // We don't pass the eventSource object via route state because it's not easily serializable
      // and ProjectPage will establish its own EventSource using the projectId.
      navigate(`/project/${projectId}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      // TODO: Show error to user
    }
    setIsCreatingProject(false);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">AI-Powered Web App Generator</h1>
        <p className="text-xl text-muted-foreground">
          Describe your web application and let AI generate the code for you.
        </p>
      </div>

      <Card className="mb-12 shadow-lg border-primary/20">
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle className="text-2xl">Create New Project</CardTitle>
          <CardDescription>
            Describe the website you want the AI to generate. Be as specific as possible.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Textarea
            placeholder="e.g., A personal portfolio site with a blog section and a contact form. Use a modern minimal design with a dark theme."
            value={initialPrompt}
            onChange={(e) => setInitialPrompt(e.target.value)}
            className="mb-4 min-h-[150px] text-base"
            disabled={isCreatingProject}
          />

          {isCreatingProject ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center space-x-2">
                <Spinner size="md" className="text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{CREATION_STEPS[creationStep].label}</p>
                  <div className="w-full bg-muted h-2 rounded-full mt-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
                      style={{ width: `${((creationStep + 1) / CREATION_STEPS.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground italic">
                This may take a minute. We're analyzing your requirements and crafting the perfect codebase.
              </p>
            </div>
          ) : (
          <Button
            onClick={handleCreateProject}
            disabled={isCreatingProject || !initialPrompt.trim()}
            className="w-full py-6 text-lg"
            size="lg"
          >
              Start Generating
          </Button>
          )}
        </CardContent>
      </Card>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-4">Your Projects</h2>
        <div className="h-0.5 w-20 bg-primary mb-6"></div>
      </div>

      {isLoadingProjects ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : projects.length === 0 ? (
        <Card className="p-8 text-center bg-muted/30">
          <CardContent>
            <p className="text-xl">No projects found. Start by creating a new one!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 border-primary/10">
              <CardHeader className="bg-primary/5 pb-2">
                <CardTitle className="truncate">{project.name || 'Project ' + project.id.substring(0,8)}</CardTitle>
                <CardDescription>Created: {new Date(project.createdAt).toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 pb-2">
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {project.messages[0]?.content || 'No description available.'}
                </p>
              </CardContent>
              <CardFooter className="pt-2 pb-4">
                <Button
                  variant="default"
                  onClick={() => navigate(`/project/${project.id}`)}
                  className="w-full"
                >
                  Open Project
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LandingPage;
