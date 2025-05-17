/**
 * Environment variable configuration
 *
 * This module provides a typesafe way to access environment variables
 */

import 'dotenv/config';

/**
 * Environment configuration interface
 */
export interface EnvironmentConfig {
  /** Server port */
  PORT: number;
  /** Server host */
  HOST: string;
  /** Anthropic API key */
  ANTHROPIC_API_KEY: string;
  /** Claude model to use */
  CLAUDE_MODEL: string;
  /** Workspace directory path */
  WORKSPACE_DIR: string;
  /** Template directory path */
  TEMPLATE_DIR: string;
  /** Build timeout in milliseconds */
  BUILD_TIMEOUT_MS: number;
  /** Node environment */
  NODE_ENV: 'development' | 'production' | 'test';
}

/**
 * Get a required environment variable
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get an optional environment variable or return a default value
 */
function getOptionalEnv<T>(key: string, defaultValue: T): string | T {
  return process.env[key] || defaultValue;
}

/**
 * Environment configuration object
 */
export const env: EnvironmentConfig = {
  PORT: parseInt(getOptionalEnv('PORT', '3000'), 10),
  HOST: getOptionalEnv('HOST', '0.0.0.0'),
  ANTHROPIC_API_KEY: getOptionalEnv('ANTHROPIC_API_KEY', ''),
  CLAUDE_MODEL: getOptionalEnv('CLAUDE_MODEL', 'claude-3-5-sonnet-latest'),
  WORKSPACE_DIR: getOptionalEnv('WORKSPACE_DIR', 'workspace'),
  TEMPLATE_DIR: getOptionalEnv('TEMPLATE_DIR', 'template'),
  BUILD_TIMEOUT_MS: parseInt(getOptionalEnv('BUILD_TIMEOUT_MS', '30000'), 10),
  NODE_ENV: getOptionalEnv('NODE_ENV', 'development') as 'development' | 'production' | 'test',
};
