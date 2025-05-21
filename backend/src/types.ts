// Shared types for backend

export interface BuildEvent {
  type: 'preview-ready' | 'error' | 'progress' | 'file_created' | 'file_viewed' | 'file_edited' | string;
  projectId: string;
  message?: string;
  data?: any;
}
