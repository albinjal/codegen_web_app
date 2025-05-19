import Anthropic from '@anthropic-ai/sdk';
import { EventEmitter } from 'events';
import { env } from '../../config/env.js';
import { getProjectFileTree } from '../build/fileTreeUtil.js';
import { generateToolsXml } from '../build/toolConfig.js';

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

      // Generate the tools XML from our centralized definitions
      const toolsXml = generateToolsXml();

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

${toolsXml}

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
