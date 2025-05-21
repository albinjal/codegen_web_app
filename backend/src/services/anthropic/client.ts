import Anthropic from '@anthropic-ai/sdk';
import { EventEmitter } from 'events';
import { env } from '../../config/env.js';
import { getProjectFileTree, getAllSrcFilesContent } from '../build/fileTreeUtil.js';
import { generateToolsXml } from '../build/toolConfig.js';
import { generateSystemPrompt } from '../../utils/systemPrompt.js';

// Define model configuration based on environment
const MODEL_CONFIG = {
  model: env.CLAUDE_MODEL,
  maxTokens: 8000,
  temperature: 0.5,
};

export interface AnthropicMessageEvent {
  type: 'content' | 'error' | 'complete';
  content?: string;
  error?: string;
}

export interface ProjectInitalIdeasOutput {
  name: string | null;
  question: string | null;
  answers: string[] | null;
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

      let allFilesContent = '';
      try {
        allFilesContent = await getAllSrcFilesContent(projectId);
      } catch (error) {
        console.warn(`Could not fetch all src files content for project ${projectId}:`, error);
        allFilesContent = 'Could not retrieve all src files content.';
      }

      // Generate the tools XML from our centralized definitions
      const toolsXml = generateToolsXml();

      const systemPrompt = generateSystemPrompt({
        projectId,
        fileTree,
        toolsXml,
        allFilesContent,
      });
      console.log(systemPrompt);
      console.log(apiMessages);

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

  async getProjectNameAndIdeas(initialPrompt: string, maxTokens: number = 1000): Promise<ProjectInitalIdeasOutput> {
    const systemPrompt = `
Based on the following project description, generate a project name, a question, and 5 possible answers to that question.
Respond strictly in JSON format.
Example response:
{
  "name": "Project Name",
  "question": "Ambiguous Question",
  "answers": ["Answer 1", "Answer 2", "Answer 3", "Answer 4", "Answer 5"]
}
`;
    const result = await this.client.messages.create({
      model: MODEL_CONFIG.model,
      max_tokens: maxTokens,
      temperature: MODEL_CONFIG.temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: initialPrompt }],
      stream: false,
    });

    let textOut = '';
    if (Array.isArray(result.content) && result.content.length > 0 && 'text' in result.content[0]) {
      textOut = result.content.map((block: any) => block.text).join('');
    } else if (typeof result.content === 'string') {
      textOut = result.content;
    }

    try {
      return JSON.parse(textOut);
    } catch (error) {
      console.error(`Error parsing project initial ideas from Anthropic:`, error, textOut);
      return { name: null, question: null, answers: null };
    }
  }
}
