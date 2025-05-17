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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

const ProjectPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [assistantStreamingMessage, setAssistantStreamingMessage] = useState<Partial<MessageData> | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const eventSourceRef = useRef<EventSource | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
          setPreviewUrl(`/preview/${projectId}/index.html?cachebust=${Date.now()}`);
        } else {
          // TODO: Handle project not found, navigate back or show error
          console.error('Project not found');
          navigate('/');
        }
      } catch (error) {
        console.error('Failed to fetch project:', error);
        // TODO: Show error to user
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
          case 'content':
            setAssistantStreamingMessage(prev => ({
              id: prev?.id || `streaming-${Date.now()}`,
              projectId: projectId,
              role: 'assistant',
              content: (prev?.content || '') + (data.content || ''),
              createdAt: prev?.createdAt || new Date().toISOString(),
            }));
            break;
          case 'complete':
            setAssistantStreamingMessage(null); // Clear streaming message
            if (data.content) { // Add the complete message to the list
              setMessages(prev => [...prev, {
                id: `assistant-${Date.now()}`,
                projectId: projectId,
                role: 'assistant',
                content: data.content || '',
                createdAt: new Date().toISOString(),
              }]);
            }
            // The backend SSE now saves the assistant message upon 'complete' from Anthropic
            break;
          case 'build':
            console.log('Build event:', data.buildType, data.message);
            if (data.buildType === 'preview-ready') {
              setPreviewUrl(`/preview/${projectId}/index.html?cachebust=${Date.now()}`);
            }
            // TODO: Display build status/logs to user
            break;
          case 'error':
            console.error('SSE Error:', data.error);
            // TODO: Show error to user
            setAssistantStreamingMessage(null);
            break;
          case 'connected': // Custom event from backend
            console.log('SSE Connected to stream:', data.message);
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
      // TODO: Handle SSE connection error, maybe try to reconnect or notify user
      eventSourceRef.current?.close();
    };

    return () => {
      console.log(`Closing EventSource for project ${projectId}`);
      eventSourceRef.current?.close();
    };
  }, [projectId, navigate]);

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
      // This call will POST the message. The backend then saves it.
      // The active EventSource (`eventSourceRef.current`) for this project ID
      // should receive updates triggered by the backend's serverEvents emitter.
      await sendMessageAndConnectSse(projectId, userMessage.content);
      // No need to create a new EventSource here if the main one is robust.
    } catch (error) {
      console.error('Failed to send message:', error);
      // TODO: Revert optimistic update or show error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id)); // Basic revert
    }
    setIsSendingMessage(false);
  };

  if (isLoading) return <p className="text-center py-10">Loading project...</p>;
  if (!project) return <p className="text-center py-10">Project not found.</p>;

  return (
    <div className="container mx-auto p-4 flex flex-col md:flex-row gap-4 h-[calc(100vh-100px)]">
      {/* Chat Area */}
      <Card className="flex-1 flex flex-col h-full">
        <CardHeader>
          <CardTitle>Chat - {project.name || `Project ${project.id.substring(0,8)}`}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-grow mb-4 pr-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`mb-3 p-3 rounded-lg max-w-[80%] ${msg.role === 'user' ? 'bg-primary text-primary-foreground ml-auto' : 'bg-muted'}`}>
                <p className="font-semibold text-sm capitalize">{msg.role}</p>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p className="text-xs text-muted-foreground text-right mt-1">{new Date(msg.createdAt).toLocaleTimeString()}</p>
              </div>
            ))}
            {assistantStreamingMessage && (
              <div key={assistantStreamingMessage.id} className="mb-3 p-3 rounded-lg max-w-[80%] bg-muted animate-pulse">
                <p className="font-semibold text-sm capitalize">assistant (streaming...)</p>
                <p className="whitespace-pre-wrap">{assistantStreamingMessage.content}</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </ScrollArea>
          <div className="flex gap-2">
            <Textarea
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isSendingMessage) { e.preventDefault(); handleSendMessage(); }}}
              className="flex-grow resize-none"
              disabled={isSendingMessage}
            />
            <Button onClick={handleSendMessage} disabled={isSendingMessage || !newMessage.trim()}>
              {isSendingMessage ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Area */}
      <Card className="flex-1 flex flex-col h-full">
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          {previewUrl ? (
            <iframe
              src={previewUrl}
              title="Project Preview"
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin" // Important for security
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Preview will appear here once the project is built.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectPage;
