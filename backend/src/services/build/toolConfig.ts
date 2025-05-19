/**
 * Central configuration for tool definitions
 * This ensures that the tool parser, implementation, and system prompt are aligned
 */

export interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  examples: {
    description: string;
    code: string;
  }[];
}

/**
 * Define all available tools
 * These definitions are used by:
 * 1. The tool parser to extract parameters
 * 2. The system prompt to describe tools to Claude
 * 3. The controller to validate parameters
 */
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'create_file',
    description: `Creates a new file in the project directory structure. Use this when:
- Adding new components, pages, or utility files
- Creating configuration files
- Adding new assets or resources

If a file already exists at the specified path, it will be overwritten.`,
    parameters: [
      {
        name: 'path',
        type: 'string',
        description: 'Path to the file relative to project root (e.g., "src/components/Button.tsx")',
        required: true
      },
      {
        name: 'content',
        type: 'string',
        description: 'Complete content to write to the file',
        required: true
      }
    ],
    examples: [
      {
        description: 'Creating a React component',
        code: `<create_file path="src/components/Button.tsx">
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
</create_file>`
      },
      {
        description: 'Creating a utility file',
        code: `<create_file path="src/utils/formatDate.ts">
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
</create_file>`
      }
    ]
  },
  {
    name: 'str_replace',
    description: `Replaces text in an existing file. Use this when:
- Modifying existing code
- Adding new features to existing files
- Fixing bugs in existing code
- Refactoring components

The tool will replace exactly one occurrence of old_str with new_str.
If old_str is empty, the tool will completely overwrite the file with new_str.`,
    parameters: [
      {
        name: 'path',
        type: 'string',
        description: 'Path to the file relative to project root',
        required: true
      },
      {
        name: 'old_str',
        type: 'string',
        description: 'Exact string to replace (must match exactly one occurrence). If empty, overwrites the file',
        required: false
      },
      {
        name: 'new_str',
        type: 'string',
        description: 'New string to insert',
        required: true
      }
    ],
    examples: [
      {
        description: 'Adding a new prop to a component',
        code: `<str_replace path="src/components/Card.tsx" old_str="interface CardProps {
  title: string;
  content: string;
}" new_str="interface CardProps {
  title: string;
  content: string;
  footer?: React.ReactNode;
}">
</str_replace>`
      },
      {
        description: 'Complete file overwrite (using empty old_str)',
        code: `<str_replace path="src/pages/Home.tsx" old_str="" new_str="import React from 'react';
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
</str_replace>`
      }
    ]
  }
];

/**
 * Generates the system prompt XML for all tools
 */
export function generateToolsXml(): string {
  let toolsXml = '<tools>\n';

  for (const tool of TOOL_DEFINITIONS) {
    toolsXml += `  <tool name="${tool.name}">\n`;
    toolsXml += `    <description>\n      ${tool.description}\n    </description>\n`;
    toolsXml += '    <parameters>\n';

    for (const param of tool.parameters) {
      toolsXml += `      <parameter name="${param.name}" type="${param.type}">${param.description}</parameter>\n`;
    }

    toolsXml += '    </parameters>\n';
    toolsXml += '    <examples>\n';

    for (const example of tool.examples) {
      toolsXml += `      <example description="${example.description}">\n`;
      toolsXml += `        ${example.code}\n`;
      toolsXml += `      </example>\n`;
    }

    toolsXml += '    </examples>\n';
    toolsXml += '  </tool>\n';
  }

  toolsXml += '</tools>';
  return toolsXml;
}

/**
 * Get required parameters for a given tool
 */
export function getRequiredParameters(toolName: string): string[] {
  const tool = TOOL_DEFINITIONS.find(t => t.name === toolName);
  if (!tool) return [];

  return tool.parameters
    .filter(param => param.required)
    .map(param => param.name);
}
