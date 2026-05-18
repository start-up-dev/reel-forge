# ReelForge Infrastructure Migration Taskboard

### GCP → Hetzner + Cloudflare R2

**Goal:** Cut hosting from ~$250/mo → ~$10/mo

---

## Phase 1 — Hetzner Server Setup

- [x] Create Hetzner account at hetzner.com/cloud
- [x] Generate SSH key on Mac: `ssh-keygen -t ed25519 -C "your@email.com"`
- [x] Copy public key to clipboard: `pbcopy < ~/.ssh/id_ed25519.pub`
- [x] Create new Project in Hetzner Console
- [x] Add Server:
  - Type: **Regular Performance → CX22** ($8.49/mo)
  - OS: **Ubuntu 24.04**
  - Location: Ashburn (US) or Nuremberg (EU)
  - Paste SSH key
  - Create Firewall: allow ports **22, 80, 443**
- [x] Note down the server IP address

---

## Phase 2 — Point Domain to Hetzner

- [ ] Go to your DNS provider (Cloudflare recommended)
- [ ] Add DNS records:
  ```
  A   @   →  <hetzner-ip>
  A   *   →  <hetzner-ip>
  ```
- [ ] Wait for DNS to propagate (~5 min with Cloudflare)

Subdomains you'll use:
| Subdomain | App |
|-----------|-----|
| `app.yourdomain.com` | Next.js web |
| `api.yourdomain.com` | Fastify API |
| `coolify.yourdomain.com` | Coolify dashboard |

---

## Phase 3 — Install Coolify

- [x] SSH into server: `ssh root@<hetzner-ip>`
- [x] Run installer:
  ```bash
  curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
  ```
- [x] Open Coolify at `http://<hetzner-ip>:8000`
- [x] Create admin account
- [ ] Click **localhost** server → click **Validate Server** (fix the red warning)
- [ ] Go to **Settings → Instance → Domain** → set `coolify.yourdomain.com`
- [ ] Confirm Coolify moves to HTTPS on your domain

---

## Phase 4 — Connect GitHub to Coolify

- [ ] Left sidebar → **Sources** → **Add** → **GitHub App**
- [ ] Authorize Coolify on your GitHub account
- [ ] Install the GitHub App on the `reel-forge` repo

---

## Phase 5 — Deploy API (Fastify)

- [ ] Left sidebar → **Projects** → **Add** → name it `ReelForge`
- [ ] Inside project → **Add Resource → Application → GitHub**
- [ ] Select repo `reel-forge`, branch `main`
- [ ] Configure:
  - Root Directory: `apps/api`
  - Build Command: `pnpm build`
  - Start Command: `node dist/index.js`
  - Port: `4000`
  - Domain: `api.yourdomain.com`
- [ ] Add all environment variables (copy from GCP)
- [ ] Click **Deploy** → confirm it goes green

---

## Phase 6 — Deploy Web App (Next.js)

- [ ] Inside same project → **Add Resource → Application → GitHub**
- [ ] Select repo `reel-forge`, branch `main`
- [ ] Configure:
  - Root Directory: `apps/web`
  - Build Command: `pnpm build`
  - Start Command: `pnpm start`
  - Port: `3000`
  - Domain: `app.yourdomain.com`
- [ ] Add all environment variables (copy from GCP)
- [ ] Click **Deploy** → confirm it goes green
- [ ] Test the app in browser

---

## Phase 7 — Deploy FFmpeg Worker

- [ ] Inside same project → **Add Resource → Application → GitHub**
- [ ] Select repo `reel-forge`, branch `main`
- [ ] Configure:
  - Root Directory: `apps/worker`
  - Build: Coolify auto-detects `Dockerfile`
  - No public domain needed (internal only)
- [ ] Add environment variables
- [ ] Click **Deploy** → confirm it goes green

---

## Phase 8 — Migrate Storage (GCS → Cloudflare R2)

- [ ] Go to Cloudflare Dashboard → **R2** → **Create Bucket**
- [ ] Name bucket: `reel-forge-assets`
- [ ] Go to **Manage R2 API Tokens** → create token with **Object Read & Write**
- [ ] Save these values:
  ```
  R2_ACCOUNT_ID=
  R2_ACCESS_KEY_ID=
  R2_SECRET_ACCESS_KEY=
  R2_BUCKET_NAME=reel-forge-assets
  ```
- [ ] Install rclone: `brew install rclone`
- [ ] Configure rclone GCS remote (source)
- [ ] Configure rclone R2 remote (destination)
- [ ] Run migration:
  ```bash
  rclone copy gcs:your-gcs-bucket r2:reel-forge-assets --progress
  ```
- [ ] Update `R2_*` env vars in Coolify for API and worker
- [ ] Swap GCS SDK for R2 in `apps/api/lib/storage.ts` (see code below)
- [ ] Deploy and verify file uploads/downloads work on R2

### R2 Code Swap

```bash
pnpm --filter @repo/api add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

```ts
// apps/api/lib/storage.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadFile(
  key: string,
  body: Buffer,
  contentType: string,
) {
  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600) {
  return getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    }),
    { expiresIn },
  );
}
```

---

## Phase 9 — Shut Down GCP

> Only do this after everything is verified working on Hetzner.

- [ ] Delete Cloud Run services (web, api, worker)
- [ ] Confirm all files are in R2, then delete GCS buckets
- [ ] Delete Load Balancers
- [ ] Delete NAT Gateways
- [ ] Delete reserved Static IPs
- [ ] **Delete the entire GCP Project** ← most important, catches hidden costs

---

## Final Cost Check

| Service        | Provider         | Cost          |
| -------------- | ---------------- | ------------- |
| VPS CX22       | Hetzner          | $8.49/mo      |
| Object Storage | Cloudflare R2    | $0            |
| PostgreSQL     | Neon free tier   | $0            |
| Auth           | Clerk free tier  | $0            |
| Email          | Resend free tier | $0            |
| DNS            | Cloudflare free  | $0            |
| **Total**      |                  | **~$8.49/mo** |

---

## Progress

- Phase 1: 3/6 done
- Phase 2: 0/3 done
- Phase 3: 4/7 done ← **YOU ARE HERE**
- Phase 4: 0/3 done
- Phase 5: 0/6 done
- Phase 6: 0/6 done
- Phase 7: 0/4 done
- Phase 8: 0/14 done
- Phase 9: 0/5 done
