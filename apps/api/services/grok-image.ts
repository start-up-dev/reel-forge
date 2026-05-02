import { env } from "../lib/env.js";

interface GrokImageResponse {
  data: Array<{ b64_json?: string; url?: string }>;
}

const GROK_IMAGE_MODEL = "grok-imagine-image";

// Appended to every prompt to prevent Grok from rendering text/subtitle overlays.
const ANTI_OVERLAY_SUFFIX =
  " No text overlays. No subtitles. No captions. No watermarks. No burned-in words. No UI elements. Clean frame only.";

export async function generateImage(prompt: string): Promise<Buffer> {
  const response = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.XAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROK_IMAGE_MODEL,
      prompt: prompt + ANTI_OVERLAY_SUFFIX,
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

// Image-to-image generation using a reference image for visual consistency.
// Uses /v1/images/edits (not /v1/images/generations) with image: { url, type } body shape.
// Falls back to standard generateImage if the edits call fails.
export async function generateImageFromReference(
  prompt: string,
  referenceImageUrl: string,
  // strength param kept for call-site compatibility but edits API doesn't use it
  _strength = 0.85,
): Promise<Buffer> {
  const consistentPrompt = `Maintain the exact same visual style, color grade, lighting, and art direction as the reference image. ${prompt}`;
  try {
    const response = await fetch("https://api.x.ai/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROK_IMAGE_MODEL,
        prompt: consistentPrompt + ANTI_OVERLAY_SUFFIX,
        image: {
          url: referenceImageUrl,
          type: "image_url",
        },
        n: 1,
        aspect_ratio: "9:16",
        response_format: "b64_json",
      }),
    });

    if (!response.ok) {
      throw new Error(`Grok img2img error ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as GrokImageResponse;
    const b64 = data.data[0]?.b64_json;
    if (!b64) throw new Error("Grok image API returned no image data.");
    return Buffer.from(b64, "base64");
  } catch (err) {
    console.warn(
      "[generateImageFromReference] falling back to standard generation:",
      err instanceof Error ? err.message : err,
    );
    return generateImage(consistentPrompt);
  }
}
