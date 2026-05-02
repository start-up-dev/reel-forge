import { Storage, type GetSignedUrlConfig } from "@google-cloud/storage";
import { env } from "./env.js";

export const ASSET_URL_TTL_MINUTES = 60 * 24 * 7; // 7 days

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

export async function generateSignedUploadUrl(
  path: string,
  contentType: string,
  expiresInMinutes = 15,
): Promise<string> {
  const config: GetSignedUrlConfig = {
    version: "v4",
    action: "write",
    expires: Date.now() + expiresInMinutes * 60 * 1000,
    contentType,
  };
  const [url] = await getBucket().file(path).getSignedUrl(config);
  return url;
}

export async function generateSignedReadUrl(
  path: string,
  expiresInMinutes = 60,
): Promise<string> {
  const config: GetSignedUrlConfig = {
    version: "v4",
    action: "read",
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  };
  const [url] = await getBucket().file(path).getSignedUrl(config);
  return url;
}

export async function deleteObject(path: string): Promise<void> {
  try {
    await getBucket().file(path).delete();
  } catch (err: unknown) {
    const code = (err as { code?: number }).code;
    if (code !== 404) throw err;
  }
}

export async function uploadBuffer(
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  await getBucket().file(path).save(buffer, { contentType });
}

export async function listObjects(prefix: string): Promise<string[]> {
  const [files] = await getBucket().getFiles({ prefix });
  return files.map((f) => f.name);
}
