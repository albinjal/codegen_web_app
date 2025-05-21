const API_BASE_URL = '/api'; // Assuming Vite proxy is set up for /api

export interface Project {
  id: string;
  createdAt: string; // Assuming ISO string date
  messages: Message[];
  name?: string;
}

export interface Message {
  id: string;
  projectId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string; // Assuming ISO string date
}

export interface SSEEventData {
  type:
    | 'historic_messages'
    | 'ai_content'
    | 'ai_complete'
    | 'ai_error' // Added for completeness, though ProjectPage handles 'error' generally
    | 'connected'
    | 'content' // Keep for now if any old code relies on it, but new types are ai_content
    | 'error'
    | 'complete' // Keep for now, new type is ai_complete
    | 'build'
    | 'projectCreated';
  content?: string; // For 'ai_content' and old 'content'
  error?: string; // For 'ai_error' and old 'error'
  projectId?: string; // For projectCreated event or general context if needed
  buildType?: string; // e.g., 'start', 'progress', 'preview-ready', 'error'
  buildMessage?: string; // Renamed from message for build messages
  messages?: Message[]; // For 'historic_messages'
  message?: Message; // For 'ai_complete' (the full assistant message object), and old 'connected' text message.
}

// Placeholder for listing projects
export const listProjects = async (): Promise<Project[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/projects`);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    const projects = await response.json() as Project[];
    // Add a simple name for display if not present, e.g., from the first message
    return projects.map(p => ({
      ...p,
      name: p.messages[0]?.content.substring(0, 50) + '...' || 'Untitled Project'
    }));
  } catch (error) {
    console.error('ApiService: Error fetching projects:', error);
    return []; // Return empty array on error for now
  }
};

// Placeholder for creating a project
export const createProjectAndConnectSse = async (initialPrompt: string): Promise<{ projectId: string; eventSource: EventSource }> => {
  let projectIdToReturn = '';
  try {
    // Only ONE POST request to create the project
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initialPrompt }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to create project: ${response.statusText} - ${errorBody}`);
    }

    // Expect backend to return { projectId }
    const { projectId } = await response.json();
    projectIdToReturn = projectId;

    // Now create the EventSource for this project
    const eventSource = new EventSource(`${API_BASE_URL}/projects/${projectId}/stream`);
    return { projectId, eventSource };

  } catch (error) {
    console.error('ApiService: Error creating project and connecting SSE:', error);
    const dummyEventSource = new EventSource('/dev/null');
    return { projectId: projectIdToReturn || 'error-id', eventSource: dummyEventSource };
  }
};

// Placeholder for getting a project by ID
export const getProject = async (projectId: string): Promise<Project | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch project ${projectId}: ${response.statusText}`);
    }
    return await response.json() as Project;
  } catch (error) {
    console.error(`ApiService: Error fetching project ${projectId}:`, error);
    return null;
  }
};

// Placeholder for sending a message
export const sendMessageAndConnectSse = async (projectId: string, content: string): Promise<{ messageId: string; eventSource: EventSource }> => {
    // Similar to createProjectAndConnectSse, this assumes POST returns messageId
    // and SSE is handled on GET /api/projects/:id/stream
    console.log(`ApiService: Sending message to project ${projectId}:`, content);

    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Simulated: Failed to send message: ${response.statusText} - ${errorBody}`);
    }

    // Assuming the POST to /messages does not return the messageId in JSON for this example to work with existing EventSource.
    // The backend POST /api/projects/:id/messages streams SSE directly.
    // The EventSource should already be established from getProject or createProjectAndConnectSse.
    // This function would just make the POST. The existing EventSource (for the project) would receive the new messages.
    // So, this function might not need to return a *new* EventSource if one is already active for the project.

    // For now, let's assume the POST to messages also implies using the existing project stream.
    // We need a messageId for optimistic updates or tracking, backend POST doesn't return it as JSON.
    const simulatedMessageId = `temp-msg-${Date.now()}`;

    console.log(`ApiService: Simulated message send for project ${projectId}. Message ID: ${simulatedMessageId}`);
    // Re-use or ensure the project's EventSource is active.
    // This is a conceptual placeholder for how the UI would get SSE updates for new messages.
    // The existing EventSource for the project (e.g., from GET /api/projects/:id/stream) should pick up the new messages.
    const eventSource = new EventSource(`${API_BASE_URL}/projects/${projectId}/stream`); // Re-establish or assume exists.

    return { messageId: simulatedMessageId, eventSource };
};
