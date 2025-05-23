import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { NotionClient } from "./notion-client.js";
import { PageTools } from "./tools/pages.js";
import { DatabaseTools } from "./tools/databases.js";
import { BlockTools } from "./tools/blocks.js";
import { SearchTools } from "./tools/search.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export class NotionMCPServer {
  private server: Server;
  private notionClient: NotionClient | null = null;
  private pageTools: PageTools | null = null;
  private databaseTools: DatabaseTools | null = null;
  private blockTools: BlockTools | null = null;
  private searchTools: SearchTools | null = null;
  private apiKey: string | undefined;

  constructor() {
    // Store API key but don't fail if missing
    this.apiKey = process.env.NOTION_API_KEY;

    // Initialize server (always)
    this.server = new Server(
      {
        name: "notion-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize Notion client and tools only if API key exists
    if (this.apiKey) {
      this.initializeNotionServices();
    }

    this.setupHandlers();
  }

  private initializeNotionServices() {
    if (!this.apiKey) return;
    
    try {
      this.notionClient = new NotionClient(this.apiKey);
      this.pageTools = new PageTools(this.notionClient);
      this.databaseTools = new DatabaseTools(this.notionClient);
      this.blockTools = new BlockTools(this.notionClient);
      this.searchTools = new SearchTools(this.notionClient);
      console.error("Notion services initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Notion services:", error);
    }
  }

  private setupHandlers() {
    // List all available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      if (!this.apiKey) {
        return {
          tools: [{
            name: "notion_setup_required",
            description: "Notion API key not configured. Set NOTION_API_KEY environment variable.",
            inputSchema: {
              type: "object",
              properties: {},
            },
          }],
        };
      }

      return {
        tools: [
          ...(this.pageTools?.getTools() || []),
          ...(this.databaseTools?.getTools() || []),
          ...(this.blockTools?.getTools() || []),
          ...(this.searchTools?.getTools() || []),
        ],
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Check if API key is missing
      if (!this.apiKey || !this.notionClient) {
        return {
          content: [
            {
              type: "text",
              text: "Notion API key not configured. Please set the NOTION_API_KEY environment variable in Claude Desktop configuration.",
            },
          ],
          isError: true,
        };
      }

      try {
        // Route to appropriate tool handler
        if (name.startsWith("notion_page_") && this.pageTools) {
          return await this.pageTools.handleTool(name, args);
        } else if (name.startsWith("notion_database_") && this.databaseTools) {
          return await this.databaseTools.handleTool(name, args);
        } else if (name.startsWith("notion_block_") && this.blockTools) {
          return await this.blockTools.handleTool(name, args);
        } else if (name.startsWith("notion_search") && this.searchTools) {
          return await this.searchTools.handleTool(name, args);
        } else {
          throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Tool execution error: ${errorMessage}`);
        
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error("Notion MCP Server running on stdio");
    
    if (!this.apiKey) {
      console.error("⚠️  WARNING: NOTION_API_KEY not set. Server running in limited mode.");
      console.error("Set NOTION_API_KEY in environment or Claude Desktop config.");
    } else {
      console.error("✅ Notion API key found. Ready to connect to Notion workspace.");
    }

    // Keep the process alive
    process.stdin.resume();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.error('Shutting down Notion MCP Server...');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.error('Shutting down Notion MCP Server...');
      process.exit(0);
    });
  }
}

// Handle uncaught errors to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});

// Start server
const server = new NotionMCPServer();
server.run().catch((error) => {
  console.error("Fatal server error:", error);
  // Don't exit immediately - let the error be logged first
  setTimeout(() => process.exit(1), 100);
});