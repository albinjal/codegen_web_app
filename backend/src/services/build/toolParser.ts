/**
 * Utility for parsing tool calls from Claude's response text
 */

export interface ToolCall {
  tool: string;
  parameters: Record<string, string>;
  rawContent: string;
}

export class ToolParser {
  /**
   * Parse tool calls from Claude's response text
   * @param text The response text from Claude
   * @returns Array of parsed tool calls
   */
  static parseToolCalls(text: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    // Parse create_file tool calls
    this.parseCreateFileCalls(text, toolCalls);

    // Parse str_replace tool calls
    this.parseStrReplaceCalls(text, toolCalls);

    return toolCalls;
  }

  /**
   * Parse create_file tool calls from text
   */
  private static parseCreateFileCalls(text: string, toolCalls: ToolCall[]): void {
    // Match <create_file path="..."> contents </create_file>
    const createFileRegex = /<create_file\s+path=['"]([^'"]+)['"]>([\s\S]*?)<\/create_file>/g;
    let match;

    while ((match = createFileRegex.exec(text)) !== null) {
      // match[0] is the full match, match[1] is the path, match[2] is the content
      const path = match[1];
      const content = match[2];

      toolCalls.push({
        tool: 'create_file',
        parameters: {
          path,
          content
        },
        rawContent: match[0]
      });
    }
  }

  /**
   * Parse str_replace tool calls from text
   */
  private static parseStrReplaceCalls(text: string, toolCalls: ToolCall[]): void {
    // Match <str_replace path="..." old_str="..." new_str="..."> </str_replace>
    // Using a more careful approach to match the attributes which may contain complex content
    const regex = /<str_replace\s+path=['"]([^'"]+)['"]\s+old_str=['"]([^]*?)['"]\s+new_str=['"]([^]*?)['"]>\s*<\/str_replace>/g;

    let match;
    while ((match = regex.exec(text)) !== null) {
      // match[0] is the full match
      // match[1] is the path
      // match[2] is the old_str
      // match[3] is the new_str

      toolCalls.push({
        tool: 'str_replace',
        parameters: {
          path: match[1],
          old_str: match[2],
          new_str: match[3]
        },
        rawContent: match[0]
      });
    }
  }
}
