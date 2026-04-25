# ReelForge — GCP Deployment Guide

This guide provides one-liner commands and step-by-step instructions to deploy the ReelForge platform (API, Web, and Worker) to Google Cloud Platform using Cloud Run.

## 🚀 One-Click Deployment

We have provided a script that automates the entire build and deploy process for all three services.

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 0. Environment Configuration

- **Project ID:** `reelforge-493603`
- **Region:** `us-central1` (Recommended)
- **Artifact Registry Repo:** `reelforge-repo`
- **GCS Bucket:** `reel-forge-assets`
- **Service Account:** `reel-forge-api@reelforge-493603.iam.gserviceaccount.com`

---

## 1. Initial Setup

### Authenticate and Set Project

```bash
gcloud auth login
gcloud config set project reelforge-493603
```

### Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudtasks.googleapis.com \
  compute.googleapis.com
```

### Create Artifact Registry Repository

```bash
gcloud artifacts repositories create reelforge-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="ReelForge Docker Repository"
```

---

## 2. Secrets Management

ReelForge uses **Secret Manager** to store sensitive environment variables. Add these secrets via the GCP Console or CLI:

| Secret Name               | Value Example                                             |
| ------------------------- | --------------------------------------------------------- |
| `database-url`            | `postgresql://user:pass@host/db?sslmode=require` (NeonDB) |
| `clerk-secret-key`        | `sk_test_...`                                             |
| `stripe-secret-key`       | `sk_test_...`                                             |
| `stripe-webhook-secret`   | `whsec_...`                                               |
| `stripe-starter-price-id` | `price_...`                                               |
| `stripe-pro-price-id`     | `price_...`                                               |
| `stripe-trial-price-id`   | `price_...`                                               |
| `anthropic-api-key`       | `sk-ant-...`                                              |
| `elevenlabs-api-key`      | `...`                                                     |
| `xai-api-key`             | `...`                                                     |
| `resend-api-key`          | `re_...`                                                  |
| `operator-secret`         | `your-random-256bit-token`                                |

### Commands to Manage Secrets

**Create a new secret:**

```bash
echo -n "YOUR_SECRET_VALUE" | gcloud secrets create stripe-trial-price-id --data-file=-
```

---

## 3. IAM & Permissions

Grant the service account access to GCS and Secrets.

### Grant GCS Admin (for asset management)

```bash
gcloud projects add-iam-policy-binding reelforge-493603 \
  --member="serviceAccount:reel-forge-api@reelforge-493603.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

### Grant Secret Manager Access

```bash
gcloud projects add-iam-policy-binding reelforge-493603 \
  --member="serviceAccount:reel-forge-api@reelforge-493603.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 4. Build and Push Docker Images

### Configure Docker Auth

```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### API

```bash
docker build --platform linux/amd64 -t us-central1-docker.pkg.dev/reelforge-493603/reelforge-repo/api:latest -f apps/api/Dockerfile .
docker push us-central1-docker.pkg.dev/reelforge-493603/reelforge-repo/api:latest
```

### Worker

```bash
docker build --platform linux/amd64 -t us-central1-docker.pkg.dev/reelforge-493603/reelforge-repo/worker:latest -f apps/worker/Dockerfile .
docker push us-central1-docker.pkg.dev/reelforge-493603/reelforge-repo/worker:latest
```

### Web (Next.js)

```bash
docker build --platform linux/amd64 -t us-central1-docker.pkg.dev/reelforge-493603/reelforge-repo/web:latest \
  --build-arg NEXT_PUBLIC_API_URL="https://reelforge-api-517804710320.us-central1.run.app" \
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_YXNzdXJlZC1zaHJpbXAtNTIuY2xlcmsuYWNjb3VudHMuZGV2JA" \
  -f apps/web/Dockerfile .

docker push us-central1-docker.pkg.dev/reelforge-493603/reelforge-repo/web:latest
```

---

## 5. Deploy to Cloud Run

### Deploy Worker (FFmpeg Assembler)

```bash
gcloud run deploy reelforge-worker \
  --image us-central1-docker.pkg.dev/reelforge-493603/reelforge-repo/worker:latest \
  --region us-central1 \
  --service-account reel-forge-api@reelforge-493603.iam.gserviceaccount.com \
  --cpu 2 --memory 4Gi \
  --timeout 3600 \
  --set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=reelforge-493603,GCS_BUCKET_NAME=reel-forge-assets" \
  --set-secrets="DATABASE_URL=database-url:latest,OPERATOR_SECRET=operator-secret:latest,RESEND_API_KEY=resend-api-key:latest" \
  --allow-unauthenticated
```

### Deploy API

```bash
gcloud run deploy reelforge-api \
  --image us-central1-docker.pkg.dev/reelforge-493603/reelforge-repo/api:latest \
  --region us-central1 \
  --service-account reel-forge-api@reelforge-493603.iam.gserviceaccount.com \
  --set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=reelforge-493603,GCS_BUCKET_NAME=reel-forge-assets,NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YXNzdXJlZC1zaHJpbXAtNTIuY2xlcmsuYWNjb3VudHMuZGV2JA,RESEND_FROM_EMAIL=hello@reelforge.ai,NEXT_PUBLIC_APP_URL=https://reelforge-web-517804710320.us-central1.run.app,API_URL=https://reelforge-api-517804710320.us-central1.run.app,WORKER_URL=https://reelforge-worker-517804710320.us-central1.run.app" \
  --set-secrets="DATABASE_URL=database-url:latest,CLERK_SECRET_KEY=clerk-secret-key:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest,STRIPE_WEBHOOK_SECRET=stripe-webhook-secret:latest,STRIPE_STARTER_PRICE_ID=stripe-starter-price-id:latest,STRIPE_PRO_PRICE_ID=stripe-pro-price-id:latest,STRIPE_TRIAL_PRICE_ID=stripe-trial-price-id:latest,ANTHROPIC_API_KEY=anthropic-api-key:latest,ELEVENLABS_API_KEY=elevenlabs-api-key:latest,XAI_API_KEY=xai-api-key:latest,RESEND_API_KEY=resend-api-key:latest,OPERATOR_SECRET=operator-secret:latest" \
  --allow-unauthenticated
```

### Deploy Web (Next.js)

```bash
gcloud run deploy reelforge-web \
  --image us-central1-docker.pkg.dev/reelforge-493603/reelforge-repo/web:latest \
  --region us-central1 \
  --service-account reel-forge-api@reelforge-493603.iam.gserviceaccount.com \
  --set-env-vars="NODE_ENV=production,NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YXNzdXJlZC1zaHJpbXAtNTIuY2xlcmsuYWNjb3VudHMuZGV2JA" \
  --set-secrets="CLERK_SECRET_KEY=clerk-secret-key:latest" \
  --allow-unauthenticated
```

---

## 7. Additional Infrastructure

### Cloud Tasks Queue (Optional but Recommended)

Creating the queue allows the system to scale if you switch from direct HTTP calls to queued tasks.

```bash
gcloud tasks queues create assembly-queue --location=us-central1
```

### Cloud Scheduler (Periodic Jobs)

To automate quota resets and system cleanup, you must create Scheduler jobs. Replace `API_URL` and `YOUR_SECRET` with your real values.

**1. Reset Daily Quotas (Every Midnight UTC)**

```bash
gcloud scheduler jobs create http reset-daily-quota \
  --schedule="0 0 * * *" \
  --uri="https://reelforge-api-517804710320.us-central1.run.app/api/jobs/reset-daily-quota" \
  --http-method=POST \
  --headers="X-Operator-Secret=reelforge-local-secret-123" \
  --location=us-central1
```

**2. Reset Monthly Quotas (1st of Month UTC)**

```bash
gcloud scheduler jobs create http reset-monthly-quota \
  --schedule="0 0 1 * *" \
  --uri="https://reelforge-api-517804710320.us-central1.run.app/api/jobs/reset-monthly-quota" \
  --http-method=POST \
  --headers="X-Operator-Secret=reelforge-local-secret-123" \
  --location=us-central1
```

**3. Cleanup Stale Clips (Every 5 Minutes)**

```bash
gcloud scheduler jobs create http cleanup-stale-clips \
  --schedule="*/5 * * * *" \
  --uri="https://reelforge-api-517804710320.us-central1.run.app/api/jobs/cleanup-stale-clips" \
  --http-method=POST \
  --headers="X-Operator-Secret=reelforge-local-secret-123" \
  --location=us-central1
```
