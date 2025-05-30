import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, CheckCircle, AlertCircle, FileCode, CodeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  pending?: boolean;
  isLoadingDots?: boolean;
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

  let workingContent = content;

  // Regex for complete create_file
  const createFileRegex = /<create_file\s+path=["']([^"']+)["']>([\s\S]*?)<\/create_file>/g;
  // Regex for complete str_replace
  const strReplaceRegex = /<str_replace\s+path=["']([^"']+)["']\s+old_str=["']([\s\S]*?)["']\s+new_str=["']([\s\S]*?)["']>\s*<\/str_replace>/g;
  // Regex for complete str_replace (overwrite form)
  const strReplaceOverwriteRegex = /<str_replace\s+path=["']([^"']+)["']>([\s\S]*?)<\/str_replace>/g;

  // Regex for incomplete create_file (opening tag, no closing tag)
  const incompleteCreateFileRegex = /<create_file\s+path=["']([^"']+)["']>([\s\S]*)$/;
  // Regex for incomplete str_replace (old_str/new_str form, opening tag, no closing tag)
  const incompleteStrReplaceRegex = /<str_replace\s+path=["']([^"']+)["']\s+old_str=["']([\s\S]*?)["']\s+new_str=["']([\s\S]*?)["']>([\s\S]*)$/;
  // Regex for incomplete str_replace (overwrite form, opening tag, no closing tag)
  const incompleteStrReplaceOverwriteRegex = /<str_replace\s+path=["']([^"']+)["']>([\s\S]*)$/;

  // Helper to find the first tool tag (complete or incomplete)
  const firstToolTagRegex = /<create_file\s+path=["']([^"']+)["']>|<str_replace\s+path=["']([^"']+)["'](?:\s+old_str=["']([\s\S]*?)["']\s+new_str=["']([\s\S]*?)["'])?>/g;

  let lastIndex = 0;
  while (true) {
    // Find the next tool tag (complete or incomplete)
    const next = firstToolTagRegex.exec(workingContent);
    if (!next) break;
    if (next.index > lastIndex) {
      const text = workingContent.slice(lastIndex, next.index);
      if (text.trim()) segments.push({ type: 'text', content: text });
    }
    // Determine which tool and parse accordingly
    if (next[0].startsWith('<create_file')) {
      // Try to match complete create_file
      createFileRegex.lastIndex = next.index;
      const complete = createFileRegex.exec(workingContent);
      if (complete && complete.index === next.index) {
        segments.push({
          type: 'tool',
          toolType: 'create_file',
          path: complete[1],
          details: { path: complete[1], content: complete[2].trim() },
          loading: isStreaming
        });
        lastIndex = complete.index + complete[0].length;
        firstToolTagRegex.lastIndex = lastIndex;
        continue;
      }
      // Otherwise, treat as incomplete
      const incomplete = incompleteCreateFileRegex.exec(workingContent.slice(next.index));
      if (incomplete) {
        segments.push({
          type: 'tool',
          toolType: 'create_file',
          path: incomplete[1],
          details: { path: incomplete[1], content: incomplete[2] },
          loading: true
        });
        // No more content after incomplete
        return segments;
      }
    } else if (next[0].startsWith('<str_replace')) {
      // Try to match complete str_replace (old_str/new_str form)
      strReplaceRegex.lastIndex = next.index;
      const complete = strReplaceRegex.exec(workingContent);
      if (complete && complete.index === next.index) {
        segments.push({
          type: 'tool',
          toolType: 'str_replace',
          path: complete[1],
          details: { path: complete[1], oldStr: complete[2], newStr: complete[3] },
          loading: isStreaming
        });
        lastIndex = complete.index + complete[0].length;
        firstToolTagRegex.lastIndex = lastIndex;
        continue;
      }
      // Try to match complete str_replace (overwrite form)
      strReplaceOverwriteRegex.lastIndex = next.index;
      const completeOverwrite = strReplaceOverwriteRegex.exec(workingContent);
      if (completeOverwrite && completeOverwrite.index === next.index && !/old_str=|new_str=/.test(completeOverwrite[0])) {
        segments.push({
          type: 'tool',
          toolType: 'str_replace',
          path: completeOverwrite[1],
          details: { path: completeOverwrite[1], oldStr: '', newStr: completeOverwrite[2] },
          loading: isStreaming
        });
        lastIndex = completeOverwrite.index + completeOverwrite[0].length;
        firstToolTagRegex.lastIndex = lastIndex;
        continue;
      }
      // Otherwise, treat as incomplete (old_str/new_str form)
      const incomplete = incompleteStrReplaceRegex.exec(workingContent.slice(next.index));
      if (incomplete) {
        segments.push({
          type: 'tool',
          toolType: 'str_replace',
          path: incomplete[1],
          details: { path: incomplete[1], oldStr: incomplete[2], newStr: incomplete[3] },
          loading: true
        });
        return segments;
      }
      // Otherwise, treat as incomplete (overwrite form)
      const incompleteOverwrite = incompleteStrReplaceOverwriteRegex.exec(workingContent.slice(next.index));
      if (incompleteOverwrite && !/old_str=|new_str=/.test(incompleteOverwrite[0])) {
        segments.push({
          type: 'tool',
          toolType: 'str_replace',
          path: incompleteOverwrite[1],
          details: { path: incompleteOverwrite[1], oldStr: '', newStr: incompleteOverwrite[2] },
          loading: true
        });
        return segments;
      }
    }
    // If we get here, just move past this tag
    lastIndex = next.index + next[0].length;
    firstToolTagRegex.lastIndex = lastIndex;
  }
  // Any remaining text
  if (workingContent.slice(lastIndex).trim()) segments.push({ type: 'text', content: workingContent.slice(lastIndex) });
  return segments;
};

// Helper to guess language from file extension
function guessLanguageFromPath(path?: string): string {
  if (!path) return 'text';
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
  if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.css')) return 'css';
  if (path.endsWith('.html')) return 'html';
  if (path.endsWith('.md')) return 'markdown';
  if (path.endsWith('.py')) return 'python';
  if (path.endsWith('.sh')) return 'bash';
  if (path.endsWith('.yml') || path.endsWith('.yaml')) return 'yaml';
  return 'text';
}

// Utility to strip triple backtick code block markers and language tags from code
function stripCodeBlockMarkersFromCode(code: string): string {
  return code.replace(/```[a-zA-Z0-9]*\n([\s\S]*?)```/g, '$1').replace(/```([\s\S]*?)```/g, '$1');
}

// Component for displaying tool operations
const ToolOperation: React.FC<{ type: string; code?: string; path?: string; details?: any; loading?: boolean }> = ({
  type, code, path, details, loading
}) => {
  // Auto-expand while loading, allow manual collapse after
  const [isExpanded, setIsExpanded] = useState(!!loading);
  React.useEffect(() => {
    if (loading) setIsExpanded(true);
  }, [loading]);

  // Animated shimmer bar for loading
  const ShimmerBar = () => (
    <div className="relative w-full h-4 bg-muted/60 overflow-hidden rounded mb-2">
      <div className="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-primary/30 to-transparent animate-shimmer" />
    </div>
  );

  // Animated dots for header
  const AnimatedDots = () => {
    const [dotCount, setDotCount] = useState(1);
    React.useEffect(() => {
      if (!loading) return;
      const interval = setInterval(() => setDotCount(d => (d % 3) + 1), 400);
      return () => clearInterval(interval);
    }, [loading]);
    return <span className="ml-1">{'.'.repeat(dotCount)}</span>;
  };

  const isOverwrite = type === 'str_replace' && (details?.oldStr === '' || details?.oldStr == null);
  return (
    <Card className="mb-3 overflow-hidden border-primary/10">
      <div
        className="bg-muted/50 p-3 flex items-center justify-between cursor-pointer select-none"
        onClick={() => !loading && setIsExpanded((open) => !open)}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
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
              : isOverwrite
                ? `Overwriting: ${path}`
                : `Editing: ${path}`}
            {loading && <AnimatedDots />}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={e => { e.stopPropagation(); if (!loading) setIsExpanded(open => !open); }}
          className="h-7 w-7 p-0"
          disabled={loading}
          tabIndex={-1}
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="p-3 bg-muted/20 max-h-[300px] overflow-auto">
          {loading && <ShimmerBar />}
          {type === 'create_file' || isOverwrite ? (
            <SyntaxHighlighter
              language={guessLanguageFromPath(path)}
              style={prism}
              customStyle={{ borderRadius: 8, margin: '0', fontSize: 14 }}
              showLineNumbers={false}
            >
              {stripCodeBlockMarkersFromCode(isOverwrite ? details?.newStr || '' : details?.content || code || '')}
            </SyntaxHighlighter>
          ) : (
            <div className="text-xs font-mono space-y-2">
              <div className="bg-red-100 rounded p-2 whitespace-pre-wrap">
                <b className="text-red-700">Old:</b>
                <SyntaxHighlighter
                  language={guessLanguageFromPath(path)}
                  style={prism}
                  customStyle={{ borderRadius: 8, margin: '0', fontSize: 14, background: 'transparent' }}
                  showLineNumbers={false}
                >
                  {stripCodeBlockMarkersFromCode(details?.oldStr || '')}
                </SyntaxHighlighter>
              </div>
              <div className="bg-green-100 rounded p-2 whitespace-pre-wrap">
                <b className="text-green-700">New:</b>
                <SyntaxHighlighter
                  language={guessLanguageFromPath(path)}
                  style={prism}
                  customStyle={{ borderRadius: 8, margin: '0', fontSize: 14, background: 'transparent' }}
                  showLineNumbers={false}
                >
                  {stripCodeBlockMarkersFromCode(details?.newStr || '')}
                </SyntaxHighlighter>
              </div>
            </div>
          )}
          {loading && (
            <div className="text-xs text-muted-foreground mt-2">Writing code...</div>
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

// Animated loading dots for waiting state
const LoadingDots: React.FC = () => {
  const [dotCount, setDotCount] = useState(1);
  React.useEffect(() => {
    const interval = setInterval(() => setDotCount(d => (d % 3) + 1), 400);
    return () => clearInterval(interval);
  }, []);
  return <span className="ml-1 text-primary">{'.'.repeat(dotCount)}</span>;
};

// Utility to strip all triple backticks and language tags from text (for chat messages)
function stripAllCodeBlockMarkers(text: string): string {
  // Remove all ```lang\n...``` and ```...```
  return text.replace(/```[a-zA-Z0-9]*\n([\s\S]*?)```/g, '$1').replace(/```([\s\S]*?)```/g, '$1');
}


export const ChatMessage: React.FC<ChatMessageProps> = ({
  role, content, timestamp, isStreaming, isLoadingDots
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

  if (isLoadingDots) {
    return (
      <div className={cn("mb-4 flex justify-start")}>
        <div className="max-w-3/4 order-2">
                  <div className="flex items-center mb-1">
          <div className="h-8 w-8 mr-2 rounded-full overflow-hidden border-2 border-gradient-to-r from-yellow-400 to-orange-500 bg-gradient-to-r from-yellow-400 to-orange-500">
            <img
              src="/assets/russ.png"
              alt="Russ Hanneman"
              className="w-full h-full object-cover object-center"
            />
          </div>
          <span className="text-xs text-muted-foreground">{new Date(timestamp).toLocaleTimeString()}</span>
        </div>
          <div className="p-3 rounded-lg bg-muted flex items-center">
            <span className="text-base font-medium text-muted-foreground">AI is thinking</span>
            <LoadingDots />
          </div>
        </div>
      </div>
    );
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
            <div className="h-8 w-8 mr-2 rounded-full overflow-hidden border-2 border-gradient-to-r from-yellow-400 to-orange-500 bg-gradient-to-r from-yellow-400 to-orange-500">
              <img
                src="/assets/russ.png"
                alt="Russ Hanneman"
                className="w-full h-full object-cover object-center"
              />
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
              {role === 'assistant' ? stripAllCodeBlockMarkers(seg.content) : seg.content}
            </div>
          )
        )}
      </div>
    </div>
  );
};
