import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NotionClient } from "../notion-client.js";
import { z } from "zod";

export class PageTools {
  constructor(private notionClient: NotionClient) {}

  getTools(): Tool[] {
    return [
      {
        name: "notion_page_create",
        description: "Create a new Notion page",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Title of the page",
            },
            content: {
              type: "string",
              description: "Content of the page (supports markdown)",
            },
            parentPageId: {
              type: "string",
              description: "Parent page ID (optional, creates in workspace root if not provided)",
            },
          },
          required: ["title"],
        },
      },
      {
        name: "notion_page_get",
        description: "Get a Notion page by ID",
        inputSchema: {
          type: "object",
          properties: {
            pageId: {
              type: "string",
              description: "The ID of the page to retrieve",
            },
            includeContent: {
              type: "boolean",
              description: "Whether to include page content blocks",
              default: true,
            },
          },
          required: ["pageId"],
        },
      },
      {
        name: "notion_page_update",
        description: "Update a Notion page",
        inputSchema: {
          type: "object",
          properties: {
            pageId: {
              type: "string",
              description: "The ID of the page to update",
            },
            title: {
              type: "string",
              description: "New title for the page",
            },
            archived: {
              type: "boolean",
              description: "Archive/unarchive the page",
            },
          },
          required: ["pageId"],
        },
      },
      {
        name: "notion_page_delete",
        description: "Delete (archive) a Notion page",
        inputSchema: {
          type: "object",
          properties: {
            pageId: {
              type: "string",
              description: "The ID of the page to delete",
            },
          },
          required: ["pageId"],
        },
      },
    ];
  }

  async handleTool(name: string, args: any) {
    const client = this.notionClient.getClient();

    switch (name) {
      case "notion_page_create": {
        const validated = z.object({
          title: z.string(),
          content: z.string().optional(),
          parentPageId: z.string().optional(),
        }).parse(args);

        const blocks: any[] = [];
        if (validated.content) {
          // Convert markdown-like content to Notion blocks
          const lines = validated.content.split('\n');
          for (const line of lines) {
            if (line.trim()) {
              blocks.push({
                object: "block" as const,
                type: "paragraph" as const,
                paragraph: {
                  rich_text: [{
                    type: "text" as const,
                    text: { content: line },
                  }],
                },
              });
            }
          }
        }

        const page = await this.notionClient.withRateLimit(async () => {
          const pageData: any = {
            properties: {
              title: {
                title: [{
                  text: { content: validated.title },
                }],
              },
            },
            children: blocks,
          };

          if (validated.parentPageId) {
            pageData.parent = { page_id: validated.parentPageId };
          }

          return await client.pages.create(pageData);
        });

        return {
          content: [{
            type: "text",
            text: `Created page "${validated.title}" with ID: ${page.id}\nURL: ${(page as any).url || 'N/A'}`,
          }],
        };
      }

      case "notion_page_get": {
        const validated = z.object({
          pageId: z.string(),
          includeContent: z.boolean().default(true),
        }).parse(args);

        const page = await this.notionClient.withRateLimit(async () => {
          return await client.pages.retrieve({ page_id: validated.pageId });
        });

        let content = `# Page Information\n\n`;
        
        // Extract title
        const titleProp = (page as any).properties?.title || (page as any).properties?.Name;
        if (titleProp?.title) {
          const title = titleProp.title.map((t: any) => t.plain_text).join('');
          content += `**Title:** ${title}\n`;
        }

        content += `**ID:** ${page.id}\n`;
        content += `**URL:** ${(page as any).url}\n`;
        content += `**Created:** ${(page as any).created_time}\n`;
        content += `**Last edited:** ${(page as any).last_edited_time}\n`;

        if (validated.includeContent) {
          // Get page blocks
          const blocks = await this.notionClient.withRateLimit(async () => {
            return await client.blocks.children.list({
              block_id: validated.pageId,
              page_size: 100,
            });
          });

          if (blocks.results.length > 0) {
            content += `\n## Content\n\n`;
            for (const block of blocks.results) {
              content += this.blockToString(block) + '\n';
            }
          }
        }

        return {
          content: [{
            type: "text",
            text: content,
          }],
        };
      }

      case "notion_page_update": {
        const validated = z.object({
          pageId: z.string(),
          title: z.string().optional(),
          archived: z.boolean().optional(),
        }).parse(args);

        const updates: any = {};
        
        if (validated.title) {
          updates.properties = {
            title: {
              title: [{
                text: { content: validated.title },
              }],
            },
          };
        }

        if (validated.archived !== undefined) {
          updates.archived = validated.archived;
        }

        const page = await this.notionClient.withRateLimit(async () => {
          return await client.pages.update({
            page_id: validated.pageId,
            ...updates,
          });
        });

        return {
          content: [{
            type: "text",
            text: `Updated page ${page.id}${validated.title ? ` with new title "${validated.title}"` : ''}${validated.archived !== undefined ? ` (archived: ${validated.archived})` : ''}`,
          }],
        };
      }

      case "notion_page_delete": {
        const validated = z.object({
          pageId: z.string(),
        }).parse(args);

        await this.notionClient.withRateLimit(async () => {
          return await client.pages.update({
            page_id: validated.pageId,
            archived: true,
          });
        });

        return {
          content: [{
            type: "text",
            text: `Archived page ${validated.pageId}`,
          }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private blockToString(block: any): string {
    switch (block.type) {
      case 'paragraph':
        return block.paragraph.rich_text.map((t: any) => t.plain_text).join('');
      case 'heading_1':
        return `# ${block.heading_1.rich_text.map((t: any) => t.plain_text).join('')}`;
      case 'heading_2':
        return `## ${block.heading_2.rich_text.map((t: any) => t.plain_text).join('')}`;
      case 'heading_3':
        return `### ${block.heading_3.rich_text.map((t: any) => t.plain_text).join('')}`;
      case 'bulleted_list_item':
        return `• ${block.bulleted_list_item.rich_text.map((t: any) => t.plain_text).join('')}`;
      case 'numbered_list_item':
        return `1. ${block.numbered_list_item.rich_text.map((t: any) => t.plain_text).join('')}`;
      case 'to_do':
        return `${block.to_do.checked ? '☑' : '☐'} ${block.to_do.rich_text.map((t: any) => t.plain_text).join('')}`;
      case 'code':
        return `\`\`\`${block.code.language}\n${block.code.rich_text.map((t: any) => t.plain_text).join('')}\n\`\`\``;
      default:
        return '';
    }
  }
}