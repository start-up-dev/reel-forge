#!/bin/bash

# ReelForge GCP Deployment Script
# Usage:
#   ./deploy.sh all      - Deploy everything
#   ./deploy.sh api      - Deploy only the API
#   ./deploy.sh worker   - Deploy only the Worker
#   ./deploy.sh web      - Deploy only the Web app

# --- Configuration -----------------------------------------------------------
PROJECT_ID="reelforge-493603"
REGION="us-central1"
REPO_NAME="reelforge-repo"
SERVICE_ACCOUNT="reel-forge-api@${PROJECT_ID}.iam.gserviceaccount.com"
GCS_BUCKET="reel-forge-assets"

# Derived Variables
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"
API_IMAGE="${REGISTRY}/api:latest"
WORKER_IMAGE="${REGISTRY}/worker:latest"
WEB_IMAGE="${REGISTRY}/web:latest"

# Public Keys & Config (Not secrets)
CLERK_PUB_KEY="pk_test_YXNzdXJlZC1zaHJpbXAtNTIuY2xlcmsuYWNjb3VudHMuZGV2JA"
RESEND_EMAIL="hello@reelforge.ai"
STABLE_API_URL="https://reelforge-api-517804710320.us-central1.run.app"

# --- Functions ---------------------------------------------------------------

deploy_worker() {
  echo "🏗️ Building Worker..."
  docker build --platform linux/amd64 -t $WORKER_IMAGE -f apps/worker/Dockerfile .
  echo "🚀 Pushing Worker image..."
  docker push $WORKER_IMAGE

  echo "🚢 Deploying Worker to Cloud Run..."
  gcloud run deploy reelforge-worker \
    --image $WORKER_IMAGE \
    --region $REGION \
    --service-account $SERVICE_ACCOUNT \
    --cpu 2 --memory 4Gi \
    --timeout 3600 \
    --set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=${PROJECT_ID},GCS_BUCKET_NAME=${GCS_BUCKET}" \
    --set-secrets="DATABASE_URL=database-url:latest,OPERATOR_SECRET=operator-secret:latest,RESEND_API_KEY=resend-api-key:latest" \
    --allow-unauthenticated
}

deploy_web() {
  echo "🏗️ Building Web (Next.js)..."
  docker build --platform linux/amd64 -t $WEB_IMAGE \
    --build-arg NEXT_PUBLIC_API_URL="$STABLE_API_URL" \
    --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$CLERK_PUB_KEY" \
    -f apps/web/Dockerfile .
  echo "🚀 Pushing Web image..."
  docker push $WEB_IMAGE

  echo "🚢 Deploying Web to Cloud Run..."
  gcloud run deploy reelforge-web \
    --image $WEB_IMAGE \
    --region $REGION \
    --service-account $SERVICE_ACCOUNT \
    --set-env-vars="NODE_ENV=production,NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${CLERK_PUB_KEY}" \
    --set-secrets="CLERK_SECRET_KEY=clerk-secret-key:latest" \
    --allow-unauthenticated
}

deploy_api() {
  echo "🏗️ Building API..."
  docker build --platform linux/amd64 -t $API_IMAGE -f apps/api/Dockerfile .
  echo "🚀 Pushing API image..."
  docker push $API_IMAGE

  echo "🔍 Fetching dependency URLs..."
  WORKER_URL=$(gcloud run services describe reelforge-worker --region $REGION --format='value(status.url)' 2>/dev/null || echo "")
  WEB_URL=$(gcloud run services describe reelforge-web --region $REGION --format='value(status.url)' 2>/dev/null || echo "")

  echo "🚢 Deploying API to Cloud Run..."
  gcloud run deploy reelforge-api \
    --image $API_IMAGE \
    --region $REGION \
    --service-account $SERVICE_ACCOUNT \
    --set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=${PROJECT_ID},GCS_BUCKET_NAME=${GCS_BUCKET},WORKER_URL=${WORKER_URL},NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${CLERK_PUB_KEY},RESEND_FROM_EMAIL=${RESEND_EMAIL},NEXT_PUBLIC_APP_URL=${WEB_URL},API_URL=${STABLE_API_URL}" \
    --set-secrets="DATABASE_URL=database-url:latest,CLERK_SECRET_KEY=clerk-secret-key:latest,STRIPE_SECRET_KEY=stripe-secret-key:latest,STRIPE_WEBHOOK_SECRET=stripe-webhook-secret:latest,STRIPE_STARTER_PRICE_ID=stripe-starter-price-id:latest,STRIPE_PRO_PRICE_ID=stripe-pro-price-id:latest,STRIPE_TRIAL_PRICE_ID=stripe-trial-price-id:latest,ANTHROPIC_API_KEY=anthropic-api-key:latest,ELEVENLABS_API_KEY=elevenlabs-api-key:latest,XAI_API_KEY=xai-api-key:latest,RESEND_API_KEY=resend-api-key:latest,OPERATOR_SECRET=operator-secret:latest" \
    --allow-unauthenticated
}

# --- Execution ---------------------------------------------------------------

# Ensure we are logged in and in the right project
gcloud config set project $PROJECT_ID
gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet

case "$1" in
  worker)
    deploy_worker
    ;;
  web)
    deploy_web
    ;;
  api)
    deploy_api
    ;;
  all)
    deploy_worker
    deploy_web
    deploy_api
    ;;
  *)
    echo "Usage: $0 {api|worker|web|all}"
    exit 1
    ;;
esac

echo "✅ Deployment of '$1' complete!"
