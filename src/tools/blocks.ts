import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { NotionClient } from "../notion-client.js";
import { z } from "zod";

export class BlockTools {
  constructor(private notionClient: NotionClient) {}

  getTools(): Tool[] {
    return [
      {
        name: "notion_block_append",
        description: "Append blocks to a page or another block",
        inputSchema: {
          type: "object",
          properties: {
            parentId: {
              type: "string",
              description: "ID of the parent page or block",
            },
            blocks: {
              type: "array",
              description: "Array of blocks to append",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: ["paragraph", "heading_1", "heading_2", "heading_3", "bulleted_list_item", "numbered_list_item", "to_do", "code", "quote", "divider"],
                  },
                  content: {
                    type: "string",
                    description: "Text content of the block",
                  },
                  checked: {
                    type: "boolean",
                    description: "For to_do blocks, whether it's checked",
                  },
                  language: {
                    type: "string",
                    description: "For code blocks, the programming language",
                  },
                },
                required: ["type"],
              },
            },
          },
          required: ["parentId", "blocks"],
        },
      },
      {
        name: "notion_block_get_children",
        description: "Get all child blocks of a page or block",
        inputSchema: {
          type: "object",
          properties: {
            blockId: {
              type: "string",
              description: "ID of the parent block or page",
            },
            recursive: {
              type: "boolean",
              description: "Whether to fetch nested blocks recursively",
              default: false,
            },
          },
          required: ["blockId"],
        },
      },
      {
        name: "notion_block_update",
        description: "Update an existing block",
        inputSchema: {
          type: "object",
          properties: {
            blockId: {
              type: "string",
              description: "ID of the block to update",
            },
            content: {
              type: "string",
              description: "New content for the block",
            },
            checked: {
              type: "boolean",
              description: "For to_do blocks, whether it's checked",
            },
          },
          required: ["blockId"],
        },
      },
      {
        name: "notion_block_delete",
        description: "Delete a block",
        inputSchema: {
          type: "object",
          properties: {
            blockId: {
              type: "string",
              description: "ID of the block to delete",
            },
          },
          required: ["blockId"],
        },
      },
    ];
  }

  async handleTool(name: string, args: any) {
    const client = this.notionClient.getClient();

    switch (name) {
      case "notion_block_append": {
        const validated = z.object({
          parentId: z.string(),
          blocks: z.array(z.object({
            type: z.enum(["paragraph", "heading_1", "heading_2", "heading_3", "bulleted_list_item", "numbered_list_item", "to_do", "code", "quote", "divider"]),
            content: z.string().optional(),
            checked: z.boolean().optional(),
            language: z.string().optional(),
          })),
        }).parse(args);

        const notionBlocks = validated.blocks.map(block => {
          const baseBlock: any = {
            object: "block",
            type: block.type,
          };

          if (block.type === "divider") {
            baseBlock.divider = {};
          } else if (block.type === "to_do") {
            baseBlock.to_do = {
              rich_text: [{
                type: "text",
                text: { content: block.content || "" },
              }],
              checked: block.checked || false,
            };
          } else if (block.type === "code") {
            baseBlock.code = {
              rich_text: [{
                type: "text",
                text: { content: block.content || "" },
              }],
              language: block.language || "plain text",
            };
          } else {
            baseBlock[block.type] = {
              rich_text: [{
                type: "text",
                text: { content: block.content || "" },
              }],
            };
          }

          return baseBlock;
        });

        const response = await this.notionClient.withRateLimit(async () => {
          return await client.blocks.children.append({
            block_id: validated.parentId,
            children: notionBlocks,
          });
        });

        return {
          content: [{
            type: "text",
            text: `Successfully appended ${response.results.length} blocks to ${validated.parentId}`,
          }],
        };
      }

      case "notion_block_get_children": {
        const validated = z.object({
          blockId: z.string(),
          recursive: z.boolean().default(false),
        }).parse(args);

        const blocks = await this.getBlockChildren(client, validated.blockId, validated.recursive);
        
        let result = `# Block Children\n\n`;
        result += this.formatBlocks(blocks, 0);

        return {
          content: [{
            type: "text",
            text: result,
          }],
        };
      }

      case "notion_block_update": {
        const validated = z.object({
          blockId: z.string(),
          content: z.string().optional(),
          checked: z.boolean().optional(),
        }).parse(args);

        // First get the block to know its type
        const block = await this.notionClient.withRateLimit(async () => {
          return await client.blocks.retrieve({ block_id: validated.blockId });
        });

        const updateData: any = {};
        
        if ('type' in block) {
          const blockType = block.type;
          
          if (validated.content !== undefined) {
            if (blockType === 'to_do') {
              updateData.to_do = {
                rich_text: [{
                  type: "text",
                  text: { content: validated.content },
                }],
              };
              if (validated.checked !== undefined) {
                updateData.to_do.checked = validated.checked;
              }
            } else if (blockType !== 'divider') {
              updateData[blockType] = {
                rich_text: [{
                  type: "text",
                  text: { content: validated.content },
                }],
              };
            }
          } else if (validated.checked !== undefined && blockType === 'to_do') {
            updateData.to_do = { checked: validated.checked };
          }
        }

        await this.notionClient.withRateLimit(async () => {
          return await client.blocks.update({
            block_id: validated.blockId,
            ...updateData,
          });
        });

        return {
          content: [{
            type: "text",
            text: `Updated block ${validated.blockId}`,
          }],
        };
      }

      case "notion_block_delete": {
        const validated = z.object({
          blockId: z.string(),
        }).parse(args);

        await this.notionClient.withRateLimit(async () => {
          return await client.blocks.delete({ block_id: validated.blockId });
        });

        return {
          content: [{
            type: "text",
            text: `Deleted block ${validated.blockId}`,
          }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async getBlockChildren(client: any, blockId: string, recursive: boolean): Promise<any[]> {
    const response = await this.notionClient.withRateLimit(async () => {
      return await client.blocks.children.list({
        block_id: blockId,
        page_size: 100,
      });
    });

    const blocks = response.results;

    if (recursive) {
      for (const block of blocks) {
        if ('has_children' in block && block.has_children) {
          const children = await this.getBlockChildren(client, block.id, true);
          (block as any).children = children;
        }
      }
    }

    return blocks;
  }

  private formatBlocks(blocks: any[], indent: number): string {
    let result = '';
    const indentStr = '  '.repeat(indent);

    for (const block of blocks) {
      if ('type' in block) {
        const content = this.blockToString(block);
        if (content) {
          result += `${indentStr}${content}\n`;
        }

        if ((block as any).children) {
          result += this.formatBlocks((block as any).children, indent + 1);
        }
      }
    }

    return result;
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
        const code = block.code.rich_text.map((t: any) => t.plain_text).join('');
        return `\`\`\`${block.code.language}\n${code}\n\`\`\``;
      case 'quote':
        return `> ${block.quote.rich_text.map((t: any) => t.plain_text).join('')}`;
      case 'divider':
        return '---';
      default:
        return `[${block.type} block]`;
    }
  }
}