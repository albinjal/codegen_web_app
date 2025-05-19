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

// Type for message segments
type TextSegment = { type: 'text'; content: string };
type ToolSegment = { type: 'tool'; toolType: string; path?: string; details?: any; loading: boolean };
type MessageSegment = TextSegment | ToolSegment;

// Helper to split message into segments (text/tool)
const splitMessageSegments = (content: string, isStreaming: boolean) => {
  const segments: Array<
    | { type: 'text'; content: string }
    | { type: 'tool'; toolType: string; path?: string; details?: any; loading: boolean }
  > = [];

  let lastIndex = 0;

  // Regex for create_file
  const createFileRegex = /<create_file\s+path=["']([^"']+)["']>([\s\S]*?)<\/create_file>/g;
  // Regex for str_replace
  const strReplaceRegex = /<str_replace\s+path=["']([^"']+)["']\s+old_str=["']([\s\S]*?)["']\s+new_str=["']([\s\S]*?)["']>\s*<\/str_replace>/g;

  // Merge both regexes for a global scan
  const combinedRegex = /<create_file\s+path=["']([^"']+)["']>([\s\S]*?)<\/create_file>|<str_replace\s+path=["']([^"']+)["']\s+old_str=["']([\s\S]*?)["']\s+new_str=["']([\s\S]*?)["']>\s*<\/str_replace>/g;

  let match;
  let lastToolEnd = 0;
  while ((match = combinedRegex.exec(content)) !== null) {
    // Text before this tool call
    if (match.index > lastToolEnd) {
      const text = content.slice(lastToolEnd, match.index);
      if (text.trim()) segments.push({ type: 'text', content: text });
    }
    if (match[0].startsWith('<create_file')) {
      const path = match[1];
      const fileContent = match[2];
      segments.push({
        type: 'tool',
        toolType: 'create_file',
        path,
        details: { path, content: fileContent.trim() },
        loading: isStreaming // If streaming, show as loading
      });
    } else if (match[0].startsWith('<str_replace')) {
      const path = match[3];
      const oldStr = match[4];
      const newStr = match[5];
      segments.push({
        type: 'tool',
        toolType: 'str_replace',
        path,
        details: { path, oldStr, newStr },
        loading: isStreaming
      });
    }
    lastToolEnd = match.index + match[0].length;
  }
  // Any text after the last tool call
  if (lastToolEnd < content.length) {
    const text = content.slice(lastToolEnd);
    if (text.trim()) segments.push({ type: 'text', content: text });
  }
  return segments;
};

// Component for displaying tool operations
const ToolOperation: React.FC<{ type: string; code?: string; path?: string; details?: any; loading?: boolean }> = ({
  type, code, path, details, loading
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Animated placeholder for loading
  const LoadingPlaceholder = () => (
    <div className="animate-pulse space-y-2">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-4 bg-muted rounded w-1/2" />
      <div className="h-4 bg-muted rounded w-5/6" />
      <div className="h-4 bg-muted rounded w-2/3" />
    </div>
  );

  return (
    <Card className="mb-3 overflow-hidden border-primary/10">
      <div className="bg-muted/50 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {loading && <Spinner size="sm" className="mr-1 text-primary" />}
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
          onClick={() => !loading && setIsExpanded(!isExpanded)}
          className="h-7 w-7 p-0"
          disabled={loading}
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="p-3 bg-muted/20 max-h-[300px] overflow-auto">
          {loading ? (
            <>
              <LoadingPlaceholder />
              <div className="text-xs text-muted-foreground mt-2">Waiting for AI to finish...</div>
            </>
          ) : type === 'create_file' ? (
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
        {loading ? (
          <>
            <Spinner size="sm" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Completed successfully</span>
          </>
        )}
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
  // For assistant, split into segments
  const segments: MessageSegment[] =
    role === 'assistant'
      ? splitMessageSegments(content, !!isStreaming)
      : [{ type: 'text', content }];

  // Type guard
  function isToolSegment(seg: MessageSegment): seg is ToolSegment {
    return seg.type === 'tool';
  }

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

        {/* Render segments in order */}
        {segments.map((seg, i) =>
          isToolSegment(seg) ? (
            <ToolOperation
              key={i}
              type={seg.toolType}
              path={seg.path}
              details={seg.details}
              loading={!!seg.loading && isStreaming}
            />
          ) : (
            <div
              key={i}
              className={cn(
                "p-3 rounded-lg whitespace-pre-wrap",
                role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted',
                i > 0 ? 'mt-2' : ''
              )}
            >
              {seg.content}
            </div>
          )
        )}
      </div>
    </div>
  );
};
