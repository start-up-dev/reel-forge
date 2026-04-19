import { Storage, type GetSignedUrlConfig } from "@google-cloud/storage";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { env } from "./env.js";

let _storage: Storage | null = null;

function getStorage(): Storage {
  if (!_storage) {
    _storage = new Storage({
      projectId: env.GCP_PROJECT_ID,
      ...(env.GOOGLE_APPLICATION_CREDENTIALS
        ? { keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS }
        : {}),
      ...(env.GCS_SERVICE_ACCOUNT_EMAIL
        ? { serviceAccountEmail: env.GCS_SERVICE_ACCOUNT_EMAIL }
        : {}),
    });
  }
  return _storage;
}

function getBucket() {
  return getStorage().bucket(env.GCS_BUCKET_NAME);
}

export async function downloadToFile(gcsPath: string, localPath: string): Promise<void> {
  const file = getBucket().file(gcsPath);
  const readStream = file.createReadStream();
  const writeStream = createWriteStream(localPath);
  await pipeline(readStream, writeStream);
}

export async function uploadFile(
  gcsPath: string,
  localPath: string,
  contentType: string,
): Promise<void> {
  await getBucket().file(gcsPath).save(
    await import("node:fs/promises").then((fs) => fs.readFile(localPath)),
    { contentType },
  );
}

export async function generateSignedReadUrl(
  gcsPath: string,
  expiresInMinutes = 60,
): Promise<string> {
  const config: GetSignedUrlConfig = {
    version: "v4",
    action: "read",
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  };
  const [url] = await getBucket().file(gcsPath).getSignedUrl(config);
  return url;
}

export async function deleteObject(gcsPath: string): Promise<void> {
  try {
    await getBucket().file(gcsPath).delete();
  } catch (err: unknown) {
    const code = (err as { code?: number }).code;
    if (code !== 404) throw err;
  }
}

export async function listObjects(prefix: string): Promise<string[]> {
  const [files] = await getBucket().getFiles({ prefix });
  return files.map((f) => f.name);
}
