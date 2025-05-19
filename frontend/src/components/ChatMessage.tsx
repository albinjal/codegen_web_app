import React from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { Progress } from '@/components/ui/progress';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  role,
  content,
  timestamp,
  isStreaming = false,
}) => {
  // Function to parse XML-like tool calls and render them nicely
  const formatContent = (text: string): React.ReactNode[] => {
    if (role === 'user') return [text];

    // Regular expression to match XML-like tool call tags
    const toolCallRegex = /<(create_file|str_replace|edit).*?>([\s\S]*?)<\/\1>/g;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    // Find all tool calls in the content
    const contentCopy = text;
    while ((match = toolCallRegex.exec(contentCopy)) !== null) {
      // Add the text before this match
      if (match.index > lastIndex) {
        parts.push(contentCopy.substring(lastIndex, match.index));
      }

      // Extract tool type and content
      const [fullMatch, toolType] = match;

      // Extract attributes from the opening tag
      const pathRegex = /path="([^"]*)"/;
      const pathMatch = fullMatch.match(pathRegex);
      const filePath = pathMatch ? pathMatch[1] : '';

      // Create a styled component for this tool call
      parts.push(
        <div key={match.index} className="my-2 p-2 bg-secondary/20 rounded-md border border-secondary">
          <div className="flex items-center gap-2 text-sm font-medium text-secondary-foreground">
            {toolType === 'create_file' && (
              <>
                <span>📝 Creating file: {filePath}</span>
              </>
            )}
            {toolType === 'str_replace' && (
              <>
                <span>🔄 Updating file: {filePath}</span>
              </>
            )}
            {toolType === 'edit' && (
              <>
                <span>✏️ Editing file: {filePath}</span>
              </>
            )}
          </div>
          {/* We could render a code preview of the content if needed */}
        </div>
      );

      lastIndex = match.index + fullMatch.length;
    }

    // Add any remaining text after the last match
    if (lastIndex < contentCopy.length) {
      parts.push(contentCopy.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  return (
    <div
      className={cn(
        "mb-3 p-3 rounded-lg max-w-[85%]",
        role === 'user'
          ? "bg-primary text-primary-foreground ml-auto"
          : "bg-muted mr-auto",
        isStreaming && "animate-pulse"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <p className="font-semibold text-sm capitalize">{role}</p>
        {isStreaming && <Spinner size="sm" />}
      </div>

      <div className="whitespace-pre-wrap">
        {formatContent(content)}
      </div>

      <p className="text-xs text-muted-foreground text-right mt-1">
        {new Date(timestamp).toLocaleTimeString()}
      </p>
    </div>
  );
};

export const BuildStatus: React.FC<{
  status: string;
  message?: string;
  progress?: number;
}> = ({ status, message, progress }) => {
  return (
    <div className="my-4 p-3 rounded-lg bg-secondary/10 border border-secondary/20 w-full">
      <div className="flex items-center gap-2 mb-2">
        {status === 'in-progress' && <Spinner size="sm" />}
        {status === 'complete' && <span className="text-green-500">✓</span>}
        {status === 'error' && <span className="text-red-500">✗</span>}
        <p className="font-medium text-sm">
          {status === 'in-progress' && 'Building your project...'}
          {status === 'complete' && 'Build completed successfully!'}
          {status === 'error' && 'Build failed'}
        </p>
      </div>

      {message && <p className="text-sm text-muted-foreground mb-2">{message}</p>}

      {(status === 'in-progress' && progress !== undefined) && (
        <Progress value={progress} className="h-1.5" />
      )}
    </div>
  );
};
