import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NotionClient } from "../notion-client.js";
import { z } from "zod";

export class DatabaseTools {
  constructor(private notionClient: NotionClient) {}

  getTools(): Tool[] {
    return [
      {
        name: "notion_database_query",
        description: "Query a Notion database with filters and sorting",
        inputSchema: {
          type: "object",
          properties: {
            databaseId: {
              type: "string",
              description: "The ID of the database to query",
            },
            filter: {
              type: "object",
              description: "Filter object (Notion API format)",
            },
            sorts: {
              type: "array",
              description: "Array of sort objects",
              items: {
                type: "object",
                properties: {
                  property: { type: "string" },
                  direction: { 
                    type: "string",
                    enum: ["ascending", "descending"],
                  },
                },
              },
            },
            pageSize: {
              type: "number",
              description: "Number of results to return (max 100)",
              default: 10,
            },
          },
          required: ["databaseId"],
        },
      },
      {
        name: "notion_database_create_page",
        description: "Create a new page in a Notion database",
        inputSchema: {
          type: "object",
          properties: {
            databaseId: {
              type: "string",
              description: "The ID of the database",
            },
            properties: {
              type: "object",
              description: "Properties for the new database page",
              additionalProperties: true,
            },
            content: {
              type: "string",
              description: "Optional content for the page",
            },
          },
          required: ["databaseId", "properties"],
        },
      },
      {
        name: "notion_database_update_page",
        description: "Update a page in a Notion database",
        inputSchema: {
          type: "object",
          properties: {
            pageId: {
              type: "string",
              description: "The ID of the page to update",
            },
            properties: {
              type: "object",
              description: "Properties to update",
              additionalProperties: true,
            },
          },
          required: ["pageId", "properties"],
        },
      },
      {
        name: "notion_database_get_schema",
        description: "Get the schema (properties) of a Notion database",
        inputSchema: {
          type: "object",
          properties: {
            databaseId: {
              type: "string",
              description: "The ID of the database",
            },
          },
          required: ["databaseId"],
        },
      },
    ];
  }

  async handleTool(name: string, args: any) {
    const client = this.notionClient.getClient();

    switch (name) {
      case "notion_database_query": {
        const validated = z.object({
          databaseId: z.string(),
          filter: z.object({}).optional(),
          sorts: z.array(z.object({
            property: z.string(),
            direction: z.enum(["ascending", "descending"]),
          })).optional(),
          pageSize: z.number().min(1).max(100).default(10),
        }).parse(args);

        const response = await this.notionClient.withRateLimit(async () => {
          return await client.databases.query({
            database_id: validated.databaseId,
            filter: validated.filter as any,
            sorts: validated.sorts as any,
            page_size: validated.pageSize,
          });
        });

        let result = `Found ${response.results.length} items:\n\n`;
        
        for (const page of response.results) {
          if ('properties' in page) {
            const title = this.extractTitle(page.properties);
            result += `- **${title}** (ID: ${page.id})\n`;
            
            // Show key properties
            for (const [key, value] of Object.entries(page.properties)) {
              const propValue = this.extractPropertyValue(value);
              if (propValue && key !== 'Name' && key !== 'title') {
                result += `  - ${key}: ${propValue}\n`;
              }
            }
            result += '\n';
          }
        }

        return {
          content: [{
            type: "text",
            text: result,
          }],
        };
      }

      case "notion_database_create_page": {
        const validated = z.object({
          databaseId: z.string(),
          properties: z.record(z.any()),
          content: z.string().optional(),
        }).parse(args);

        // Convert simple property values to Notion format
        const notionProperties: any = {};
        for (const [key, value] of Object.entries(validated.properties)) {
          notionProperties[key] = this.convertToNotionProperty(key, value);
        }

        const children: any[] = [];
        if (validated.content) {
          children.push({
            object: "block" as const,
            type: "paragraph" as const,
            paragraph: {
              rich_text: [{
                type: "text" as const,
                text: { content: validated.content },
              }],
            },
          });
        }

        const page = await this.notionClient.withRateLimit(async () => {
          return await client.pages.create({
            parent: { database_id: validated.databaseId },
            properties: notionProperties,
            children: children,
          });
        });

        return {
          content: [{
            type: "text",
            text: `Created database page with ID: ${page.id}\nURL: ${(page as any).url}`,
          }],
        };
      }

      case "notion_database_update_page": {
        const validated = z.object({
          pageId: z.string(),
          properties: z.record(z.any()),
        }).parse(args);

        // Convert simple property values to Notion format
        const notionProperties: any = {};
        for (const [key, value] of Object.entries(validated.properties)) {
          notionProperties[key] = this.convertToNotionProperty(key, value);
        }

        const page = await this.notionClient.withRateLimit(async () => {
          return await client.pages.update({
            page_id: validated.pageId,
            properties: notionProperties,
          });
        });

        return {
          content: [{
            type: "text",
            text: `Updated database page ${page.id}`,
          }],
        };
      }

      case "notion_database_get_schema": {
        const validated = z.object({
          databaseId: z.string(),
        }).parse(args);

        const database = await this.notionClient.withRateLimit(async () => {
          return await client.databases.retrieve({
            database_id: validated.databaseId,
          });
        });

        let schema = `# Database Schema: ${(database as any).title?.[0]?.plain_text || 'Untitled'}\n\n`;
        schema += `**ID:** ${database.id}\n`;
        schema += `**Created:** ${(database as any).created_time}\n\n`;
        schema += `## Properties\n\n`;

        for (const [name, prop] of Object.entries((database as any).properties)) {
          const property = prop as any;
          schema += `### ${name}\n`;
          schema += `- Type: ${property.type}\n`;
          
          switch (property.type) {
            case 'select':
              if (property.select?.options) {
                schema += `- Options: ${property.select.options.map((o: any) => o.name).join(', ')}\n`;
              }
              break;
            case 'multi_select':
              if (property.multi_select?.options) {
                schema += `- Options: ${property.multi_select.options.map((o: any) => o.name).join(', ')}\n`;
              }
              break;
            case 'relation':
              schema += `- Related database: ${property.relation?.database_id}\n`;
              break;
          }
          schema += '\n';
        }

        return {
          content: [{
            type: "text",
            text: schema,
          }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private extractTitle(properties: any): string {
    // Try common title property names
    const titleProps = ['title', 'Title', 'Name', 'name'];
    
    for (const prop of titleProps) {
      if (properties[prop]?.title) {
        return properties[prop].title.map((t: any) => t.plain_text).join('');
      }
    }
    
    // If no title found, use the first property
    const firstProp = Object.values(properties)[0] as any;
    if (firstProp?.title) {
      return firstProp.title.map((t: any) => t.plain_text).join('');
    }
    
    return 'Untitled';
  }

  private extractPropertyValue(property: any): string {
    switch (property.type) {
      case 'title':
      case 'rich_text':
        return property[property.type]?.map((t: any) => t.plain_text).join('') || '';
      case 'number':
        return property.number?.toString() || '';
      case 'select':
        return property.select?.name || '';
      case 'multi_select':
        return property.multi_select?.map((s: any) => s.name).join(', ') || '';
      case 'date':
        return property.date?.start || '';
      case 'checkbox':
        return property.checkbox ? '✓' : '✗';
      case 'url':
        return property.url || '';
      case 'email':
        return property.email || '';
      case 'phone_number':
        return property.phone_number || '';
      case 'status':
        return property.status?.name || '';
      default:
        return '';
    }
  }

  private convertToNotionProperty(key: string, value: any): any {
    // Auto-detect property type based on value
    if (typeof value === 'string') {
      // Check if it's a title/name field
      if (key.toLowerCase() === 'title' || key.toLowerCase() === 'name') {
        return {
          title: [{
            text: { content: value },
          }],
        };
      }
      // Default to rich text
      return {
        rich_text: [{
          text: { content: value },
        }],
      };
    } else if (typeof value === 'number') {
      return { number: value };
    } else if (typeof value === 'boolean') {
      return { checkbox: value };
    } else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
      return { date: { start: new Date(value).toISOString() } };
    } else if (Array.isArray(value)) {
      // Assume multi-select
      return {
        multi_select: value.map(v => ({ name: String(v) })),
      };
    } else if (typeof value === 'object' && value !== null) {
      // Return as-is if it's already in Notion format
      return value;
    }
    
    // Default to rich text
    return {
      rich_text: [{
        text: { content: String(value) },
      }],
    };
  }
}