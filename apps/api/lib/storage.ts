import { Storage } from "@google-cloud/storage";
import { env } from "./env.js";

// Lazily instantiated so the server can start even if GCP credentials
// aren't configured (e.g. during local development without GCS).
let _storage: Storage | null = null;

function getStorage(): Storage {
  if (!_storage) {
    _storage = new Storage({
      projectId: env.GCP_PROJECT_ID,
      ...(env.GOOGLE_APPLICATION_CREDENTIALS
        ? { keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS }
        : {}),
    });
  }
  return _storage;
}

function getBucket() {
  return getStorage().bucket(env.GCS_BUCKET_NAME);
}

/**
 * Generate a signed URL that allows an HTTP PUT to upload a file directly
 * to GCS from the client (browser or extension).
 */
export async function generateSignedUploadUrl(
  path: string,
  contentType: string,
  expiresInMinutes = 15,
): Promise<string> {
  const [url] = await getBucket()
    .file(path)
    .generateSignedPostPolicyV4({
      expires: Date.now() + expiresInMinutes * 60 * 1000,
      conditions: [["content-type", contentType]],
    })
    .then(() =>
      getBucket().file(path).getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + expiresInMinutes * 60 * 1000,
        contentType,
      }),
    );
  return url;
}

/**
 * Generate a signed URL that allows an HTTP GET to download a private GCS object.
 */
export async function generateSignedReadUrl(
  path: string,
  expiresInMinutes = 60,
): Promise<string> {
  const [url] = await getBucket().file(path).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  });
  return url;
}

/**
 * Delete a single object from GCS. Silently succeeds if the object does not exist.
 */
export async function deleteObject(path: string): Promise<void> {
  try {
    await getBucket().file(path).delete();
  } catch (err: unknown) {
    const code = (err as { code?: number }).code;
    if (code !== 404) throw err;
  }
}

/**
 * Upload a Buffer directly to GCS (used by server-side AI pipelines).
 */
export async function uploadBuffer(
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  await getBucket().file(path).save(buffer, { contentType });
}

/**
 * List all object paths under the given prefix.
 */
export async function listObjects(prefix: string): Promise<string[]> {
  const [files] = await getBucket().getFiles({ prefix });
  return files.map((f) => f.name);
}
