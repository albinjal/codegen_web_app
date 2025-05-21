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
