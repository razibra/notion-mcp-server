import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";

export class NotionClient {
  private client: Client;
  private n2m: NotionToMarkdown;

  constructor(apiKey: string) {
    this.client = new Client({
      auth: apiKey,
      notionVersion: process.env.NOTION_API_VERSION || "2022-06-28",
    });

    // Initialize markdown converter
    this.n2m = new NotionToMarkdown({ notionClient: this.client });
  }

  getClient(): Client {
    return this.client;
  }

  getMarkdownConverter(): NotionToMarkdown {
    return this.n2m;
  }

  // Utility method to handle rate limiting
  async withRateLimit<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      if (error.code === 'rate_limited') {
        const retryAfter = error.headers?.['retry-after'] || 5;
        console.error(`Rate limited. Retrying after ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return await operation();
      }
      throw error;
    }
  }
}