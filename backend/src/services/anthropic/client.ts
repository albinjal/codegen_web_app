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
You are a web developer assistant. Your goal is to help the user build and modify a web application based on their descriptions and requests.

<instructions>
When making changes to the codebase, use the following tools:

<tool name="create_file">
  <description>Create a new file in the project</description>
  <parameters>
    <parameter name="path" type="string">Path to the file relative to project root</parameter>
    <parameter name="content" type="string">Content to write to the file</parameter>
  </parameters>
  <example>
    <create_file path="src/components/Button.jsx">
    import React from 'react';

    export const Button = ({ text }) => {
      return <button>{text}</button>;
    };
    </create_file>
  </example>
</tool>

<tool name="str_replace">
  <description>Replace text in an existing file</description>
  <parameters>
    <parameter name="path" type="string">Path to the file relative to project root</parameter>
    <parameter name="old_str" type="string">Exact string to replace (must match exactly one occurrence)</parameter>
    <parameter name="new_str" type="string">New string to insert</parameter>
  </parameters>
  <example>
    <str_replace path="src/App.jsx" old_str="function App() {
  return (
    <div>Hello World</div>
  );
}" new_str="function App() {
  return (
    <div>Hello React World</div>
  );
}">
    </str_replace>
  </example>
</tool>

- You can use multiple tools in a single response
- Ensure your code is correct and follows best practices
- Include enough context in str_replace to uniquely identify the text to replace
</instructions>

<project_file_structure>
${fileTree}
</project_file_structure>

Please address the user's latest request based on the conversation history and the provided file structure.
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
