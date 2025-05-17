import Anthropic from '@anthropic-ai/sdk';
import { EventEmitter } from 'events';
import { env } from '../../config/env.js';

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
   * Stream a response from Anthropic
   */
  async streamMessage(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    systemPrompt?: string
  ): Promise<void> {
    try {
      // Format messages for the completions API
      const AImessages = this.formatMessagesForCompletions(messages);

      let finalPromptString = AImessages;
      if (systemPrompt && systemPrompt.trim() !== '') {
        finalPromptString = `${systemPrompt}\n\n${AImessages}`;
      } else {
        // If no systemPrompt is provided (e.g. because instructions are in `messages`),
        // ensure the formatMessagesForCompletions handles the structure.
        // The formatMessagesForCompletions already appends "Assistant:" so it should be ready.
      }

      // Stream the completions API response
      const stream = await this.client.completions.create({
        model: MODEL_CONFIG.model,
        max_tokens_to_sample: MODEL_CONFIG.maxTokens,
        temperature: MODEL_CONFIG.temperature,
        prompt: finalPromptString,
        stream: true,
      });

      // Process the stream
      let fullContent = '';

      for await (const completion of stream) {
        if (completion.completion) {
          const text = completion.completion;
          fullContent += text;

          // Emit the message content
          this.emit('message', {
            type: 'content',
            content: text,
          });
        }
      }

      // Emit complete event with full content
      this.emit('message', {
        type: 'complete',
        content: fullContent,
      });
    } catch (error) {
      console.error('Error streaming from Anthropic:', error);
      this.emit('message', {
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Format message history for completions API
   */
  private formatMessagesForCompletions(messages: Array<{ role: 'user' | 'assistant'; content: string }>): string {
    return messages.map(message => {
      const rolePrefix = message.role === 'user' ? 'Human: ' : 'Assistant: ';
      return `${rolePrefix}${message.content}`;
    }).join('\n\n') + '\n\nAssistant:';
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

  /**
   * Format the user prompt to include XML and context about the task
   */
  formatPrompt(prompt: string): string {
    return `
<context>
You are a web developer assistant that helps generate website code based on user descriptions.
When the user asks for changes, wrap your code edits in XML tags like this:
<edit file="path/to/file.js">
// Code content goes here
</edit>

You can create multiple edits to different files in one response.
</context>

${prompt}
`;
  }
}
