import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getProject,
  sendMessageAndConnectSse,
  Project as ProjectData,
  Message as MessageData,
  SSEEventData,
} from '@/lib/ApiService';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { ChatMessage } from '@/components/ChatMessage';
import { ResizableLayout } from '@/components/ResizableLayout';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const ProjectPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [assistantStreamingMessage, setAssistantStreamingMessage] = useState<Partial<MessageData> | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [buildStatus, setBuildStatus] = useState<{
    status: 'idle' | 'in-progress' | 'complete' | 'error';
    message?: string;
    progress?: number;
  }>({ status: 'idle' });
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!projectId) {
      navigate('/'); // Should not happen if routes are correct
      return;
    }

    const fetchProjectData = async () => {
      setIsLoading(true);
      try {
        const fetchedProject = await getProject(projectId);
        if (fetchedProject) {
          setProject(fetchedProject);
          setMessages(fetchedProject.messages || []);
          setPreviewUrl(`/preview/${projectId}/dist/index.html?cachebust=${Date.now()}`);
        } else {
          console.error('Project not found');
          toast({
            variant: "destructive",
            title: "Project not found",
            description: "The project you're looking for doesn't exist.",
          });
          navigate('/');
        }
      } catch (error) {
        console.error('Failed to fetch project:', error);
        toast({
          variant: "destructive",
          title: "Error loading project",
          description: "Failed to load project data. Please try again later.",
        });
        navigate('/');
      }
      setIsLoading(false);
    };

    fetchProjectData();

    // Setup EventSource
    console.log(`ProjectPage: Setting up EventSource for project ${projectId}`);
    eventSourceRef.current = new EventSource(`/api/projects/${projectId}/stream`);

    eventSourceRef.current.onopen = () => {
      console.log(`EventSource connected for project ${projectId}`);
    };

    eventSourceRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SSEEventData;
        console.log('SSE Received:', data);

        switch (data.type) {
          case 'historic_messages':
            if (Array.isArray(data.messages)) {
              setMessages(data.messages);
            }
            break;
          case 'ai_content':
            setAssistantStreamingMessage(prev => ({
              id: prev?.id || `streaming-${Date.now()}`,
              projectId: projectId!,
              role: 'assistant',
              content: (prev?.content || '') + (data.content || ''),
              createdAt: prev?.createdAt || new Date().toISOString(),
            }));
            break;
          case 'ai_complete':
            setAssistantStreamingMessage(null);
            if (data.message && data.message.content) {
              setMessages(prev => [...prev, data.message as MessageData]);
            }
            break;
          case 'build':
            console.log('Build event:', data.buildType, data.buildMessage);

            // Handle build events
            if (data.buildType === 'start') {
              setBuildStatus({
                status: 'in-progress',
                message: data.buildMessage || 'Starting build...',
                progress: 10,
              });
              setIsPreviewLoading(true);

              toast({
                title: "Build started",
                description: "Your project is being built...",
              });
            }
            else if (data.buildType === 'progress') {
              setBuildStatus(prev => ({
                status: 'in-progress',
                message: data.buildMessage || prev.message,
                progress: Math.min((prev.progress || 10) + 20, 90), // Increment progress
              }));
            }
            else if (data.buildType === 'preview-ready') {
              setBuildStatus({
                status: 'complete',
                message: 'Preview ready!',
                progress: 100,
              });

              // Update preview URL with cache-busting
              setPreviewUrl(`/preview/${projectId}/dist/index.html?cachebust=${Date.now()}`);

              toast({
                variant: "success",
                title: "Build complete",
                description: "Your preview is ready to view!",
              });

              // Wait a moment for the build to fully complete, then reset loading state
              setTimeout(() => {
                setIsPreviewLoading(false);

                // Reset build status after a few seconds
                setTimeout(() => {
                  setBuildStatus({ status: 'idle' });
                }, 3000);
              }, 1000);
            }
            else if (data.buildType === 'error') {
              setBuildStatus({
                status: 'error',
                message: data.buildMessage || 'Build failed',
              });
              setIsPreviewLoading(false);

              toast({
                variant: "destructive",
                title: "Build failed",
                description: data.buildMessage || "There was an error building your project.",
              });
            }
            break;
          case 'error':
            console.error('SSE Error:', data.error);
            setAssistantStreamingMessage(null);

            toast({
              variant: "destructive",
              title: "Connection error",
              description: data.error || "There was a problem with the server connection.",
            });
            break;
          default:
            console.warn('Unhandled SSE event type:', data.type);
        }
      } catch (error) {
        console.error('Error parsing SSE event:', error, event.data);
      }
    };

    eventSourceRef.current.onerror = (error) => {
      console.error('EventSource failed:', error);
      eventSourceRef.current?.close();

      toast({
        variant: "destructive",
        title: "Connection lost",
        description: "The connection to the server was lost. Please refresh the page.",
      });
    };

    return () => {
      console.log(`Closing EventSource for project ${projectId}`);
      eventSourceRef.current?.close();
    };
  }, [projectId, navigate, toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, assistantStreamingMessage]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !projectId) return;
    setIsSendingMessage(true);

    const userMessage: MessageData = {
      id: `user-${Date.now()}`,
      projectId: projectId,
      role: 'user',
      content: newMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');

    try {
      await sendMessageAndConnectSse(projectId, userMessage.content);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.filter(m => m.id !== userMessage.id)); // Basic revert

      toast({
        variant: "destructive",
        title: "Message failed",
        description: "Your message couldn't be sent. Please try again.",
      });
    }
    setIsSendingMessage(false);
  };

  const handleIframeLoad = () => {
    setIsPreviewLoading(false);
  };

  const refreshPreview = () => {
    setIsPreviewLoading(true);
    setPreviewUrl(`/preview/${projectId}/dist/index.html?cachebust=${Date.now()}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-lg font-medium">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <div className="text-center">
          <p className="text-xl font-medium text-destructive">Project not found</p>
          <Button
            onClick={() => navigate('/')}
            className="mt-4"
            variant="outline"
          >
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  // Create the chat panel
  const chatPanel = (
    <div className="flex flex-col h-full overflow-hidden">
      <CardHeader className="px-4 py-3 border-b">
        <CardTitle className="text-lg">Chat</CardTitle>
        <CardDescription>
          {project.name || `Project ${project.id.substring(0,8)}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 h-full overflow-hidden">
        <ScrollArea className="flex-grow px-4 py-4">
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              role={msg.role}
              content={msg.content}
              timestamp={msg.createdAt}
            />
          ))}

          {assistantStreamingMessage && (
            <ChatMessage
              role="assistant"
              content={assistantStreamingMessage.content || ''}
              timestamp={assistantStreamingMessage.createdAt || new Date().toISOString()}
              isStreaming={true}
            />
          )}

          <div ref={messagesEndRef} />
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isSendingMessage) { e.preventDefault(); handleSendMessage(); }}}
              className="flex-grow resize-none min-h-[80px]"
              disabled={isSendingMessage}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isSendingMessage || !newMessage.trim()}
              size="lg"
              className="self-end"
            >
              {isSendingMessage ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Sending
                </>
              ) : 'Send'}
            </Button>
          </div>
        </div>
      </CardContent>
    </div>
  );

  // Create the preview panel with prominent build status banner
  const previewPanel = (
    <div className="flex flex-col h-full overflow-hidden">
      <CardHeader className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Live Preview</CardTitle>
            <CardDescription>
              View your generated web application
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshPreview}
            disabled={isPreviewLoading || buildStatus.status === 'in-progress'}
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </CardHeader>

      {/* Build status banner - More prominent placement */}
      {buildStatus.status !== 'idle' && (
        <div className={cn(
          "px-4 py-2.5 flex items-center gap-3",
          buildStatus.status === 'error' ? 'bg-destructive/10 border-b border-destructive/20' :
          buildStatus.status === 'complete' ? 'bg-green-500/10 border-b border-green-500/20' :
          'bg-primary/5 border-b border-primary/10'
        )}>
          {buildStatus.status === 'in-progress' && <Spinner size="sm" className="text-primary" />}
          {buildStatus.status === 'complete' && <CheckCircle className="h-5 w-5 text-green-500" />}
          {buildStatus.status === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}

          <div className="flex-1">
            <p className="font-medium text-sm">
              {buildStatus.status === 'in-progress' && 'Building project...'}
              {buildStatus.status === 'complete' && 'Build completed successfully'}
              {buildStatus.status === 'error' && 'Build failed'}
            </p>
            {buildStatus.message && <p className="text-xs text-muted-foreground">{buildStatus.message}</p>}
          </div>

          {/* Progress bar for in-progress builds */}
          {buildStatus.status === 'in-progress' && buildStatus.progress !== undefined && (
            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${buildStatus.progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      <CardContent className="flex-1 p-0 relative overflow-hidden">
        {previewUrl ? (
          <>
            <iframe
              key={previewUrl}
              ref={iframeRef}
              src={previewUrl}
              title="Project Preview"
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
              onLoad={handleIframeLoad}
            />
            {isPreviewLoading && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center backdrop-blur-sm">
                <div className="text-center">
                  <Spinner size="lg" className="mx-auto mb-4" />
                  <p className="font-medium">Building preview...</p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Preview will appear here once the project is built.</p>
          </div>
        )}
      </CardContent>
    </div>
  );

  return (
    <div className="container mx-auto p-4 h-[calc(100vh-100px)]">
      <ResizableLayout
        leftPanel={chatPanel}
        rightPanel={previewPanel}
        defaultLeftSize={40}
        defaultRightSize={60}
      />
    </div>
  );
};

export default ProjectPage;
