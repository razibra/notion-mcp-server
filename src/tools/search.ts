import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NotionClient } from "../notion-client.js";
import { z } from "zod";

export class SearchTools {
  constructor(private notionClient: NotionClient) {}

  getTools(): Tool[] {
    return [
      {
        name: "notion_search",
        description: "Search for pages and databases in Notion",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query text",
            },
            filter: {
              type: "object",
              properties: {
                property: {
                  type: "string",
                  enum: ["object"],
                  description: "Property to filter by",
                },
                value: {
                  type: "string",
                  enum: ["page", "database"],
                  description: "Filter for only pages or only databases",
                },
              },
            },
            sort: {
              type: "object",
              properties: {
                direction: {
                  type: "string",
                  enum: ["ascending", "descending"],
                  default: "descending",
                },
                timestamp: {
                  type: "string",
                  enum: ["last_edited_time"],
                  default: "last_edited_time",
                },
              },
            },
            pageSize: {
              type: "number",
              description: "Number of results to return (max 100)",
              default: 20,
            },
          },
        },
      },
      {
        name: "notion_search_by_title",
        description: "Search for pages by exact or partial title match",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Title to search for (partial match supported)",
            },
            exactMatch: {
              type: "boolean",
              description: "Whether to search for exact title match",
              default: false,
            },
            inDatabase: {
              type: "string",
              description: "Optional: Limit search to a specific database ID",
            },
          },
          required: ["title"],
        },
      },
    ];
  }

  async handleTool(name: string, args: any) {
    const client = this.notionClient.getClient();

    switch (name) {
      case "notion_search": {
        const validated = z.object({
          query: z.string().optional(),
          filter: z.object({
            property: z.literal("object"),
            value: z.enum(["page", "database"]),
          }).optional(),
          sort: z.object({
            direction: z.enum(["ascending", "descending"]).default("descending"),
            timestamp: z.literal("last_edited_time").default("last_edited_time"),
          }).optional(),
          pageSize: z.number().min(1).max(100).default(20),
        }).parse(args);

        const searchParams: any = {
          page_size: validated.pageSize,
        };

        if (validated.query) {
          searchParams.query = validated.query;
        }

        if (validated.filter) {
          searchParams.filter = validated.filter;
        }

        if (validated.sort) {
          searchParams.sort = validated.sort;
        }

        const response = await this.notionClient.withRateLimit(async () => {
          return await client.search(searchParams);
        });

        let result = `# Search Results\n\n`;
        result += `Found ${response.results.length} items${validated.query ? ` for "${validated.query}"` : ''}\n\n`;

        for (const item of response.results) {
          if (item.object === 'page') {
            const page = item as any;
            const title = this.extractPageTitle(page);
            result += `## 📄 Page: ${title}\n`;
            result += `- **ID:** ${page.id}\n`;
            result += `- **URL:** ${page.url}\n`;
            result += `- **Created:** ${new Date(page.created_time).toLocaleDateString()}\n`;
            result += `- **Last edited:** ${new Date(page.last_edited_time).toLocaleDateString()}\n`;
            
            if (page.parent?.type === 'database_id') {
              result += `- **In database:** ${page.parent.database_id}\n`;
            }
            result += '\n';
          } else if (item.object === 'database') {
            const db = item as any;
            const title = db.title?.[0]?.plain_text || 'Untitled Database';
            result += `## 🗄️ Database: ${title}\n`;
            result += `- **ID:** ${db.id}\n`;
            result += `- **URL:** ${db.url}\n`;
            result += `- **Created:** ${new Date(db.created_time).toLocaleDateString()}\n`;
            result += `- **Properties:** ${Object.keys(db.properties || {}).length}\n`;
            result += '\n';
          }
        }

        if (response.has_more) {
          result += `\n*More results available. Showing first ${validated.pageSize} results.*`;
        }

        return {
          content: [{
            type: "text",
            text: result,
          }],
        };
      }

      case "notion_search_by_title": {
        const validated = z.object({
          title: z.string(),
          exactMatch: z.boolean().default(false),
          inDatabase: z.string().optional(),
        }).parse(args);

        // Use search API with query
        const searchParams: any = {
          query: validated.title,
          page_size: 100,
        };

        if (validated.inDatabase) {
          searchParams.filter = {
            property: "parent",
            database: {
              contains: validated.inDatabase,
            },
          };
        }

        const response = await this.notionClient.withRateLimit(async () => {
          return await client.search(searchParams);
        });

        // Filter results based on title match
        const matches = [];
        for (const item of response.results) {
          if (item.object === 'page') {
            const page = item as any;
            const title = this.extractPageTitle(page);
            
            if (validated.exactMatch) {
              if (title.toLowerCase() === validated.title.toLowerCase()) {
                matches.push(page);
              }
            } else {
              if (title.toLowerCase().includes(validated.title.toLowerCase())) {
                matches.push(page);
              }
            }
          }
        }

        let result = `# Title Search Results\n\n`;
        result += `Found ${matches.length} pages matching "${validated.title}"${validated.exactMatch ? ' (exact match)' : ''}\n\n`;

        for (const page of matches) {
          const title = this.extractPageTitle(page);
          result += `## ${title}\n`;
          result += `- **ID:** ${page.id}\n`;
          result += `- **URL:** ${page.url}\n`;
          result += `- **Last edited:** ${new Date(page.last_edited_time).toLocaleDateString()}\n`;
          
          if (page.parent?.type === 'database_id') {
            result += `- **Database:** ${page.parent.database_id}\n`;
          }
          
          // Show a snippet of content if available
          const snippet = await this.getPageSnippet(client, page.id);
          if (snippet) {
            result += `- **Preview:** ${snippet}\n`;
          }
          
          result += '\n';
        }

        if (matches.length === 0) {
          result += `No pages found with title ${validated.exactMatch ? 'exactly matching' : 'containing'} "${validated.title}"`;
        }

        return {
          content: [{
            type: "text",
            text: result,
          }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private extractPageTitle(page: any): string {
    // Try to find title in properties
    const properties = page.properties || {};
    
    // Check common title property names
    for (const key of ['title', 'Title', 'Name', 'name']) {
      if (properties[key]?.title) {
        const titleArray = properties[key].title;
        if (Array.isArray(titleArray) && titleArray.length > 0) {
          return titleArray.map((t: any) => t.plain_text).join('');
        }
      }
    }

    // Check if any property has title type
    for (const [key, prop] of Object.entries(properties)) {
      if ((prop as any).type === 'title' && (prop as any).title) {
        const titleArray = (prop as any).title;
        if (Array.isArray(titleArray) && titleArray.length > 0) {
          return titleArray.map((t: any) => t.plain_text).join('');
        }
      }
    }

    return 'Untitled';
  }

  private async getPageSnippet(client: any, pageId: string): Promise<string> {
    try {
      const blocks = await this.notionClient.withRateLimit(async () => {
        return await client.blocks.children.list({
          block_id: pageId,
          page_size: 3, // Get first 3 blocks
        });
      });

      const snippets = [];
      for (const block of blocks.results) {
        if ('type' in block) {
          const text = this.extractBlockText(block);
          if (text) {
            snippets.push(text);
          }
        }
      }

      const fullSnippet = snippets.join(' ');
      return fullSnippet.length > 150 
        ? fullSnippet.substring(0, 150) + '...' 
        : fullSnippet;
    } catch {
      return '';
    }
  }

  private extractBlockText(block: any): string {
    const type = block.type;
    const blockData = block[type];
    
    if (blockData?.rich_text && Array.isArray(blockData.rich_text)) {
      return blockData.rich_text.map((t: any) => t.plain_text).join('');
    }
    
    return '';
  }
}