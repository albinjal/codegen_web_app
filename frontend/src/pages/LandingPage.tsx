import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  listProjects,
  createProjectAndConnectSse,
  Project,
} from "@/lib/ApiService"; // Corrected import path
import { Button } from "@/components/ui/button"; // Corrected import path
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card"; // Corrected import path
import { Input } from "@/components/ui/input"; // Corrected import path
import { Spinner } from "@/components/ui/spinner";
import LoadingScreen from "@/components/LoadingScreen";

const LandingPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [initialPrompt, setInitialPrompt] = useState("");
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
        console.error("Failed to fetch projects:", error);
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
      console.error("Failed to create project:", error);
      setIsCreatingProject(false);
      // TODO: Show error to user
    }
  };

  // Show loading screen overlay when creating project
  if (isCreatingProject) {
    return (
      <LoadingScreen
        loadingText="Fuck yeah! Creating your billion-dollar app..."
        duration={12000} // 12 seconds for project creation
      />
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Hero Section with Russ's Image */}
      <div className="text-center mb-12">
                <div className="flex justify-center mb-6">
          <img
            src="/assets/welcome.png"
            alt="Russ Hanneman"
            className="w-48 h-32 rounded-lg border-4 border-gradient-to-r from-yellow-400 to-orange-500 shadow-2xl object-cover"
          />
        </div>
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
          Welcome to Russable
        </h1>
        <p className="text-2xl text-muted-foreground mb-4">
          "I'm just gonna say it. This guy fucks... at web development!"
        </p>
        <p className="text-lg text-muted-foreground">
          Describe your web application and let my AI generate the code for you.
          It's like putting radio on the internet, but for websites!
        </p>
        <a
          href="https://www.youtube.com/watch?v=wGy5SGTuAGI"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black px-4 py-2 rounded-lg font-bold transition-all duration-200 hover:scale-105 cursor-pointer"
          title="Watch Russ explain the Three Comma Club"
        >
          💰 THREE COMMA CLUB MEMBER 💰
        </a>
      </div>

      <Card className="mb-12 shadow-2xl border-2 border-gradient-to-r from-yellow-400 to-orange-500">
        <CardHeader className="bg-gradient-to-r from-yellow-400/10 to-orange-500/10 border-b">
          <CardTitle className="text-3xl bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Create Your Billion-Dollar App
          </CardTitle>
          <CardDescription className="text-lg">
            Tell me what you want to build and I'll make it happen.
            ROI, baby! You know what that stands for? <strong>Russable On Internet!</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <Input
            placeholder="e.g., A sick portfolio site with a blog that'll make VCs throw money at me. Make it flashy like my McLaren!"
            value={initialPrompt}
            onChange={(e) => setInitialPrompt(e.target.value)}
            className="mb-6 text-lg p-4 border-2 focus:border-yellow-400"
            disabled={isCreatingProject}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreateProject();
              }
            }}
          />

          <Button
            onClick={handleCreateProject}
            disabled={isCreatingProject || !initialPrompt.trim()}
            className="w-full py-6 text-xl bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-bold shadow-lg"
            size="lg"
          >
            🚀 FUCK YEAH, LET'S BUILD THIS! 🚀
          </Button>
        </CardContent>
      </Card>

      <div className="mb-8">
        <h2 className="text-3xl font-semibold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
          Your Portfolio of Success
        </h2>
        <p className="text-muted-foreground mb-4">
          "You know what's better than one billion-dollar app? Multiple billion-dollar apps!"
        </p>
        <div className="h-1 w-32 bg-gradient-to-r from-yellow-400 to-orange-500 mb-6"></div>
      </div>

      {isLoadingProjects ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
          <span className="ml-4 text-lg">Loading your empire...</span>
        </div>
      ) : projects.length === 0 ? (
        <Card className="p-12 text-center bg-gradient-to-r from-yellow-400/5 to-orange-500/5 border-2 border-dashed border-yellow-400/30">
          <CardContent>
            <div className="text-6xl mb-4">🏎️</div>
            <p className="text-2xl mb-4">
              No projects yet? That's like having zero commas in your net worth!
            </p>
            <p className="text-lg text-muted-foreground">
              Start building your first billion-dollar app above. Trust me, I know what I'm talking about.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 hover:border-yellow-400/50 transform hover:scale-105"
            >
              <CardHeader className="bg-gradient-to-r from-yellow-400/10 to-orange-500/10 pb-3">
                <CardTitle className="truncate text-lg">
                  {project.name || "Project " + project.id.substring(0, 8)}
                </CardTitle>
                <CardDescription className="text-sm">
                  Created: {new Date(project.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 pb-3">
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {project.messages[0]?.content || "Another masterpiece in the making..."}
                </p>
              </CardContent>
              <CardFooter className="pt-3 pb-4">
                <Button
                  variant="default"
                  onClick={() => navigate(`/project/${project.id}`)}
                  className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-bold"
                >
                  🚗 Open Project 💨
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Russ Quotes Section */}
      <div className="mt-16 text-center">
        <Card className="bg-gradient-to-r from-yellow-400/5 to-orange-500/5 border-2 border-yellow-400/30">
          <CardContent className="p-8">
            <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Words of Wisdom from the Three Comma Club
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <blockquote className="italic text-lg border-l-4 border-yellow-400 pl-4">
                "This guy fucks. Am I right? 'Cause I'm looking at the rest of you guys,
                and this is the guy in the house doing all the fucking."
              </blockquote>
              <blockquote className="italic text-lg border-l-4 border-orange-500 pl-4">
                "ROI. You know what that stands for? Radio on Internet.
                That's how I made my billions, baby!"
              </blockquote>
              <blockquote className="italic text-lg border-l-4 border-yellow-400 pl-4">
                "I got three nannies suing me right now, one of them for no reason."
              </blockquote>
              <blockquote className="italic text-lg border-l-4 border-orange-500 pl-4">
                "Synergy, bitches. Know what that means?
                Taking your ideas and making them fucking amazing!"
              </blockquote>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LandingPage;
