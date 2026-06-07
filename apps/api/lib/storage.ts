import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env.js";

export const ASSET_URL_TTL_MINUTES = 60 * 24 * 7; // 7 days

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
      // R2 does not support the AWS SDK's default CRC32 request checksum, and it
      // breaks browser PUTs to presigned URLs (the browser can't send the
      // x-amz-checksum-crc32 header). Only add a checksum when an operation
      // strictly requires one.
      requestChecksumCalculation: "WHEN_REQUIRED",
    });
  }
  return _client;
}

export async function generateSignedUploadUrl(
  path: string,
  contentType: string,
  expiresInMinutes = 15,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: path,
    ContentType: contentType,
  });
  return getSignedUrl(getClient(), command, { expiresIn: expiresInMinutes * 60 });
}

export async function generateSignedReadUrl(
  path: string,
  expiresInMinutes = 60,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: path,
  });
  return getSignedUrl(getClient(), command, { expiresIn: expiresInMinutes * 60 });
}

export async function deleteObject(path: string): Promise<void> {
  try {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: path }),
    );
  } catch (err: unknown) {
    const code = (err as { Code?: string }).Code;
    const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode;
    if (code !== "NoSuchKey" && status !== 404) throw err;
  }
}

export async function uploadBuffer(
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: path,
      Body: buffer,
      ContentType: contentType,
    }),
  );
}

export async function listObjects(prefix: string): Promise<string[]> {
  const response = await getClient().send(
    new ListObjectsV2Command({ Bucket: env.R2_BUCKET_NAME, Prefix: prefix }),
  );
  return (response.Contents ?? []).map((obj) => obj.Key ?? "").filter(Boolean);
}
