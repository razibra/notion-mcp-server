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
  private notionClient: NotionClient;
  private pageTools: PageTools;
  private databaseTools: DatabaseTools;
  private blockTools: BlockTools;
  private searchTools: SearchTools;

  constructor() {
    // Validate environment
    if (!process.env.NOTION_API_KEY) {
      throw new Error("NOTION_API_KEY environment variable is required");
    }

    // Initialize server
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

    // Initialize Notion client and tools
    this.notionClient = new NotionClient(process.env.NOTION_API_KEY);
    this.pageTools = new PageTools(this.notionClient);
    this.databaseTools = new DatabaseTools(this.notionClient);
    this.blockTools = new BlockTools(this.notionClient);
    this.searchTools = new SearchTools(this.notionClient);

    this.setupHandlers();
  }

  private setupHandlers() {
    // List all available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        ...this.pageTools.getTools(),
        ...this.databaseTools.getTools(),
        ...this.blockTools.getTools(),
        ...this.searchTools.getTools(),
      ],
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Route to appropriate tool handler
        if (name.startsWith("notion_page_")) {
          return await this.pageTools.handleTool(name, args);
        } else if (name.startsWith("notion_database_")) {
          return await this.databaseTools.handleTool(name, args);
        } else if (name.startsWith("notion_block_")) {
          return await this.blockTools.handleTool(name, args);
        } else if (name.startsWith("notion_search")) {
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
    console.error(`Connected to Notion workspace`);
  }
}

// Start server if running as main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new NotionMCPServer();
  server.run().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}