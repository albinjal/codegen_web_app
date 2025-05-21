/**
 * Utility for parsing tool calls from Claude's response text
 */
import { TOOL_DEFINITIONS } from './toolConfig.js';

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

    // Parse tool calls for each defined tool
    for (const toolDef of TOOL_DEFINITIONS) {
      this.parseToolCallsByName(text, toolCalls, toolDef.name);
    }

    return toolCalls;
  }

  /**
   * Parse tool calls for a specific tool
   */
  private static parseToolCallsByName(text: string, toolCalls: ToolCall[], toolName: string): void {
    switch (toolName) {
      case 'create_file':
        this.parseCreateFileCalls(text, toolCalls);
        break;
      case 'str_replace':
        this.parseStrReplaceCalls(text, toolCalls);
        break;
      default:
        console.warn(`Unrecognized tool name: ${toolName}`);
    }
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

    // Also support <str_replace path="..."> ... </str_replace> as a full file overwrite
    const overwriteRegex = /<str_replace\s+path=['"]([^'"]+)['"]>([\s\S]*?)<\/str_replace>/g;
    while ((match = overwriteRegex.exec(text)) !== null) {
      // Only match if this is NOT already matched by the above (i.e., no old_str/new_str attributes)
      // To avoid double-matching, check that the match[0] does not contain 'old_str=' or 'new_str='
      if (!/old_str=|new_str=/.test(match[0])) {
        toolCalls.push({
          tool: 'str_replace',
          parameters: {
            path: match[1],
            old_str: '',
            new_str: match[2]
          },
          rawContent: match[0]
        });
      }
    }
  }
}
