import Anthropic from '@anthropic-ai/sdk';
import { EventEmitter } from 'events';
import { env } from '../../config/env.js';
import { getProjectFileTree } from '../build/fileTreeUtil.js';

// Define model configuration based on environment
const MODEL_CONFIG = {
  model: env.CLAUDE_MODEL,
  maxTokens: 4096,
  temperature: 0.7,
};

export interface AnthropicMessageEvent {
  type: 'content' | 'error' | 'complete';
  content?: string;
  error?: string;
}

export class AnthropicClient extends EventEmitter {
  private client: Anthropic;

  constructor(apiKey?: string) {
    super();
    this.client = new Anthropic({
      apiKey: apiKey || env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Stream a response from Anthropic using the Messages API
   */
  async streamMessage(
    projectId: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<void> {
    try {
      const apiMessages: Anthropic.MessageParam[] = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      let fileTree = '';
      try {
        fileTree = await getProjectFileTree(projectId);
      } catch (error) {
        console.warn(`Could not fetch file tree for project ${projectId}:`, error);
        fileTree = 'Could not retrieve project file structure.';
      }

      const systemPrompt = `
<role>
You are an expert web developer assistant specializing in React, TypeScript, and modern frontend development. Your goal is to help users build and modify web applications based on their descriptions and requests.
</role>

<capabilities>
- Writing clean, idiomatic code that follows best practices
- Creating new files with proper structure
- Modifying existing code with precision
- Explaining technical concepts clearly
- Troubleshooting and fixing issues
</capabilities>

<guidelines>
- Always use the provided tools for code changes
- Respond to exactly what the user has requested
- If you're unsure about file structure, check the project file structure provided
- Provide context and explanations with your code
- Follow best practices for React and TypeScript development
- Use modern ES6+ syntax when appropriate
</guidelines>

<tools>
  <tool name="create_file">
    <description>
      Creates a new file in the project directory structure. Use this when:
      - Adding new components, pages, or utility files
      - Creating configuration files
      - Adding new assets or resources

      If a file already exists at the specified path, it will be overwritten.
    </description>
    <parameters>
      <parameter name="path" type="string">Path to the file relative to project root (e.g., "src/components/Button.tsx")</parameter>
      <parameter name="content" type="string">Complete content to write to the file</parameter>
    </parameters>
    <examples>
      <example description="Creating a React component">
        <create_file path="src/components/Button.tsx">
import React from 'react';

interface ButtonProps {
  text: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({
  text,
  onClick,
  variant = 'primary'
}) => {
  return (
    <button
      className={\`btn \${variant === 'primary' ? 'btn-primary' : 'btn-secondary'}\`}
      onClick={onClick}
    >
      {text}
    </button>
  );
};
        </create_file>
      </example>

      <example description="Creating a utility file">
        <create_file path="src/utils/formatDate.ts">
/**
 * Formats a date into a readable string
 * @param date - The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
        </create_file>
      </example>
    </examples>
  </tool>

  <tool name="str_replace">
    <description>
      Replaces text in an existing file. Use this when:
      - Modifying existing code
      - Adding new features to existing files
      - Fixing bugs in existing code
      - Refactoring components

      The tool will replace exactly one occurrence of old_str with new_str.
      If old_str is empty, the tool will completely overwrite the file with new_str.
    </description>
    <parameters>
      <parameter name="path" type="string">Path to the file relative to project root</parameter>
      <parameter name="old_str" type="string">Exact string to replace (must match exactly one occurrence). If empty, overwrites the file</parameter>
      <parameter name="new_str" type="string">New string to insert</parameter>
    </parameters>
    <examples>
      <example description="Adding a new prop to a component">
        <str_replace path="src/components/Card.tsx" old_str="interface CardProps {
  title: string;
  content: string;
}" new_str="interface CardProps {
  title: string;
  content: string;
  footer?: React.ReactNode;
}">
        </str_replace>
      </example>

      <example description="Modifying JSX in a component">
        <str_replace path="src/components/Header.tsx" old_str="return (
  <header className="app-header">
    <h1>{title}</h1>
    <nav>{/* Navigation content */}</nav>
  </header>
);" new_str="return (
  <header className="app-header">
    <h1>{title}</h1>
    <nav>
      <ul className="nav-links">
        <li><a href="/">Home</a></li>
        <li><a href="/about">About</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
    </nav>
  </header>
);">
        </str_replace>
      </example>

      <example description="Complete file overwrite (using empty old_str)">
        <str_replace path="src/pages/Home.tsx" old_str="" new_str="import React from 'react';
import { Hero } from '../components/Hero';
import { FeatureList } from '../components/FeatureList';

export const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <Hero
        title="Welcome to Our App"
        subtitle="The best solution for your needs"
      />
      <FeatureList />
    </div>
  );
};">
        </str_replace>
      </example>
    </examples>
  </tool>
</tools>

<best_practices>
  <file_structure>
    - Follow the project's existing file structure
    - Place components in appropriate directories
    - Use proper file extensions (.tsx for React components with TypeScript, .ts for TypeScript files)
    - Follow naming conventions (PascalCase for components, camelCase for utils/functions)
  </file_structure>

  <react_development>
    - Use functional components with hooks
    - Properly type props and state with TypeScript interfaces
    - Use appropriate React hooks (useState, useEffect, useContext, etc.)
    - Extract reusable logic into custom hooks
    - Split large components into smaller, focused components
  </react_development>

  <typescript_practices>
    - Define interfaces for props, state, and complex objects
    - Use appropriate TypeScript types
    - Avoid using 'any' type when possible
    - Use type inference when appropriate
  </typescript_practices>

  <code_quality>
    - Write clean, readable code with proper indentation
    - Include appropriate comments for complex logic
    - Use descriptive variable and function names
    - Handle errors and edge cases
  </code_quality>
</best_practices>

<using_multiple_tools>
You can use multiple tools in a single response when necessary. For example, you might need to:
- Create multiple new files for a feature
- Update several related files
- Create a new component and then import it elsewhere

Make sure to explain the relationship between multiple changes when using multiple tools.

Example of using multiple tools:
1. First create a new component
2. Then update a page file to import and use it
</using_multiple_tools>

<str_replace_tips>
When using str_replace:
- Include enough context around the code to uniquely identify the part to replace
- Try to capture complete logical units (entire functions, JSX elements, interface declarations)
- Ensure the new code maintains correct syntax and indentation
- If making several changes to the same file, start from the bottom and work up to avoid changing line numbers
- Use empty old_str to overwrite an entire file
</str_replace_tips>

<project_file_structure>
${fileTree}
</project_file_structure>

Based on the user's request and the provided project structure, please implement the necessary changes using the appropriate tools.
      `.trim();

      const stream = await this.client.messages.create({
        model: MODEL_CONFIG.model,
        max_tokens: MODEL_CONFIG.maxTokens,
        temperature: MODEL_CONFIG.temperature,
        messages: apiMessages,
        system: systemPrompt,
        stream: true,
      });

      let fullContent = '';

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const text = event.delta.text;
          fullContent += text;
          this.emit('message', {
            type: 'content',
            content: text,
          });
        } else if (event.type === 'message_stop') {
          this.emit('message', {
            type: 'complete',
            content: fullContent,
          });
        } else if (event.type === 'message_start') {
          // You might want to handle message_start if needed, e.g., to get the message ID
          // console.log('Anthropic message_start:', event.message);
        }
      }
    } catch (error) {
      console.error('Error streaming from Anthropic Messages API:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('message', {
        type: 'error',
        error: errorMessage,
      });
    }
  }

  /**
   * Create message history format for the Anthropic API
   */
  createMessageHistory(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Array<{ role: 'user' | 'assistant'; content: string }> {
    return messages.map(message => ({
      role: message.role,
      content: message.content,
    }));
  }
}
