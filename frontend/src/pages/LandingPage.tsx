import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listProjects, createProjectAndConnectSse, Project } from '@/lib/ApiService'; // Corrected import path
import { Button } from '@/components/ui/button'; // Corrected import path
import { Input } from '@/components/ui/input'; // Corrected import path - though Input is not used here, good practice
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Corrected import path
import { Textarea } from '@/components/ui/textarea'; // Corrected import path

const LandingPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [initialPrompt, setInitialPrompt] = useState('');
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
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

  const handleCreateProject = async () => {
    if (!initialPrompt.trim()) {
      // TODO: Show error for empty prompt
      return;
    }
    setIsCreatingProject(true);
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
    <div className="container mx-auto py-8 px-4">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-2xl">Create New Project</CardTitle>
          <CardDescription>Describe the website you want the AI to generate.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="e.g., A personal portfolio site with a blog section and a contact form."
            value={initialPrompt}
            onChange={(e) => setInitialPrompt(e.target.value)}
            className="mb-4 min-h-[100px]"
            disabled={isCreatingProject}
          />
          <Button onClick={handleCreateProject} disabled={isCreatingProject || !initialPrompt.trim()}>
            {isCreatingProject ? 'Creating Project...' : 'Start Generating'}
          </Button>
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold mb-4">Existing Projects</h2>
      {isLoadingProjects ? (
        <p>Loading projects...</p>
      ) : projects.length === 0 ? (
        <p>No projects found. Start by creating a new one!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="truncate">{project.name || 'Project ' + project.id.substring(0,8)}</CardTitle>
                <CardDescription>Created: {new Date(project.createdAt).toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" onClick={() => navigate(`/project/${project.id}`)} className="w-full">
                  Open Project
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LandingPage;
