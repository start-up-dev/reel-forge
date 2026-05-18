import OpenAI from "openai";
import { env } from "../lib/env.js";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    if (!env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    _client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return _client;
}

export async function generateCharacterSheet(prompt: string): Promise<Buffer> {
  const client = getClient();
  const response = await client.images.generate({
    model: "gpt-image-2",
    prompt,
    n: 1,
    size: "1024x1024",
  });
  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("No image data returned from OpenAI");
  }
  return Buffer.from(b64, "base64");
}
