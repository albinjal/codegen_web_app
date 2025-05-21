import { describe, it, expect, beforeEach } from 'vitest';
import { AnthropicClient } from '../client.js';
import { EventEmitter } from 'events';

describe('AnthropicClient', () => {
  let anthropicClient: AnthropicClient;

  beforeEach(() => {
    anthropicClient = new AnthropicClient();
  });

  it('should be an instance of EventEmitter', () => {
    expect(anthropicClient).toBeInstanceOf(EventEmitter);
  });

  describe('formatPrompt', () => {
    it('should format the prompt with context', () => {
      const prompt = 'Create a website';
      const formattedPrompt = anthropicClient.formatPrompt(prompt);

      expect(formattedPrompt).toContain('<context>');
      expect(formattedPrompt).toContain('</context>');
      expect(formattedPrompt).toContain('<edit file=');
      expect(formattedPrompt).toContain(prompt);
    });
  });

  describe('createMessageHistory', () => {
    it('should return a properly formatted message history', () => {
      const messages = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there' }
      ];

      const result = anthropicClient.createMessageHistory(messages);

      expect(result).toEqual(messages);
    });
  });
});
