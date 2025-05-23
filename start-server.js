#!/usr/bin/env node

// Simple wrapper to start the MCP server with better error handling
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.error('Starting Notion MCP Server...');

// Check if NOTION_API_KEY is set
if (!process.env.NOTION_API_KEY) {
  console.error('⚠️  Warning: NOTION_API_KEY not set');
  console.error('The server will run but won\'t be able to connect to Notion');
}

try {
  // Import and run the server directly
  await import('./dist/index.js');
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}