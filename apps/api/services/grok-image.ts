import { env } from "../lib/env.js";

interface GrokImageResponse {
  data: Array<{ b64_json?: string; url?: string }>;
}

const GROK_IMAGE_MODEL = "grok-imagine-image";

export async function generateImage(prompt: string): Promise<Buffer> {
  const response = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.XAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROK_IMAGE_MODEL,
      prompt,
      n: 1,
      aspect_ratio: "9:16",
      response_format: "b64_json",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Grok image API error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as GrokImageResponse;
  const b64 = data.data[0]?.b64_json;
  if (!b64) throw new Error("Grok image API returned no image data.");
  return Buffer.from(b64, "base64");
}
