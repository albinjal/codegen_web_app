import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, CheckCircle, AlertCircle, FileCode, CodeIcon, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

interface BuildStatusProps {
  status: 'idle' | 'in-progress' | 'complete' | 'error';
  message?: string;
  progress?: number;
}

// Helper to extract and parse tool operations from message content
const extractToolOperations = (content: string) => {
  const operations: { type: string; code: string; path?: string; details?: any }[] = [];
  let cleanContent = content;

  // Match <create_file path="..."> ... </create_file>
  const createFileRegex = /<create_file\s+path=["']([^"']+)["']>([\s\S]*?)<\/create_file>/g;
  cleanContent = cleanContent.replace(createFileRegex, (match, path, fileContent) => {
    operations.push({
      type: 'create_file',
      code: fileContent.trim(),
      path,
      details: { path, content: fileContent.trim() }
    });
    return '';
  });

  // Match <str_replace path="..." old_str="..." new_str="..."> </str_replace>
  const strReplaceRegex = /<str_replace\s+path=["']([^"']+)["']\s+old_str=["']([\s\S]*?)["']\s+new_str=["']([\s\S]*?)["']>\s*<\/str_replace>/g;
  cleanContent = cleanContent.replace(strReplaceRegex, (match, path, oldStr, newStr) => {
    operations.push({
      type: 'str_replace',
      code: '',
      path,
      details: { path, oldStr, newStr }
    });
    return '';
  });

  return {
    operations,
    cleanContent: cleanContent.trim()
  };
};

// Component for displaying tool operations
const ToolOperation: React.FC<{ type: string; code: string; path?: string; details?: any }> = ({
  type, code, path, details
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="mb-3 overflow-hidden border-primary/10">
      <div className="bg-muted/50 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {type === 'create_file' ? (
            <FileCode className="h-4 w-4 text-primary" />
          ) : (
            <CodeIcon className="h-4 w-4 text-primary" />
          )}
          <span className="font-medium">
            {type === 'create_file'
              ? `Creating: ${path}`
              : `Editing: ${path}`}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-7 w-7 p-0"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="p-3 bg-muted/20 max-h-[300px] overflow-auto">
          {type === 'create_file' ? (
            <pre className="text-xs">
              <code>{details?.content || code}</code>
            </pre>
          ) : (
            <div className="text-xs">
              <div><b>Old:</b> <pre className="inline whitespace-pre-wrap">{details?.oldStr}</pre></div>
              <div><b>New:</b> <pre className="inline whitespace-pre-wrap">{details?.newStr}</pre></div>
            </div>
          )}
        </div>
      )}

      <div className="px-3 py-2 text-sm bg-primary/5 flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span>Completed successfully</span>
      </div>
    </Card>
  );
};

export const BuildStatus: React.FC<BuildStatusProps> = ({ status, message, progress }) => {
  return (
    <div className="my-2">
      <Card className={cn(
        "border overflow-hidden",
        status === 'error' ? 'border-destructive/30' : 'border-primary/30'
      )}>
        <div className={cn(
          "px-4 py-3 flex items-center gap-3",
          status === 'error' ? 'bg-destructive/10' : 'bg-primary/5'
        )}>
          {status === 'in-progress' && <Spinner size="sm" className="text-primary" />}
          {status === 'complete' && <CheckCircle className="h-5 w-5 text-green-500" />}
          {status === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}

          <div className="flex-1">
            <p className="font-medium">
              {status === 'in-progress' && 'Building project...'}
              {status === 'complete' && 'Build completed'}
              {status === 'error' && 'Build failed'}
            </p>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
          </div>
        </div>

        {status === 'in-progress' && progress !== undefined && (
          <div className="h-1.5 bg-muted w-full">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export const ChatMessage: React.FC<ChatMessageProps> = ({
  role, content, timestamp, isStreaming
}) => {
  // Extract tool operations from assistant messages
  const { operations, cleanContent } =
    role === 'assistant' ? extractToolOperations(content) : { operations: [], cleanContent: content };

  return (
    <div className={cn(
      "mb-4 flex",
      role === 'user' ? 'justify-end' : 'justify-start'
    )}>
      <div className={cn(
        "max-w-3/4",
        role === 'user' ? 'order-1' : 'order-2'
      )}>
        <div className="flex items-center mb-1">
          {role === 'assistant' && (
            <div className="h-6 w-6 mr-2 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-medium">AI</span>
            </div>
          )}
          <span className="text-xs text-muted-foreground">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        </div>

        <div className={cn(
          "p-3 rounded-lg",
          role === 'user'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}>
          {isStreaming && (
            <div className="flex items-center gap-2 mb-1">
              <Spinner size="sm" />
              <span className="text-xs font-medium">AI is typing...</span>
            </div>
          )}

          {cleanContent && (
            <div className="whitespace-pre-wrap">
              {cleanContent}
            </div>
          )}
        </div>

        {/* Render tool operations after the message content */}
        {operations.length > 0 && (
          <div className="mt-2 space-y-2">
            {operations.map((op, index) => (
              <ToolOperation
                key={index}
                type={op.type}
                code={op.code}
                path={op.path}
                details={op.details}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
