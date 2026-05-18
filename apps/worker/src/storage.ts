import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import { env } from "./env.js";

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return _client;
}

export async function downloadToFile(storagePath: string, localPath: string): Promise<void> {
  const response = await getClient().send(
    new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: storagePath }),
  );
  if (!response.Body) throw new Error(`No body in R2 response for ${storagePath}`);
  const writeStream = createWriteStream(localPath);
  await pipeline(response.Body as Readable, writeStream);
}

export async function uploadFile(
  storagePath: string,
  localPath: string,
  contentType: string,
): Promise<void> {
  const buffer = await import("node:fs/promises").then((fs) => fs.readFile(localPath));
  await getClient().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: storagePath,
      Body: buffer,
      ContentType: contentType,
    }),
  );
}

export async function generateSignedReadUrl(
  storagePath: string,
  expiresInMinutes = 60,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: storagePath,
  });
  return getSignedUrl(getClient(), command, { expiresIn: expiresInMinutes * 60 });
}

export async function deleteObject(storagePath: string): Promise<void> {
  try {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: storagePath }),
    );
  } catch (err: unknown) {
    const code = (err as { Code?: string }).Code;
    const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode;
    if (code !== "NoSuchKey" && status !== 404) throw err;
  }
}

export async function listObjects(prefix: string): Promise<string[]> {
  const response = await getClient().send(
    new ListObjectsV2Command({ Bucket: env.R2_BUCKET_NAME, Prefix: prefix }),
  );
  return (response.Contents ?? []).map((obj) => obj.Key ?? "").filter(Boolean);
}
