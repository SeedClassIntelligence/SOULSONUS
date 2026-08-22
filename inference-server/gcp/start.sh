#!/bin/bash
# Run this before a studio session. Starts the VM (GPU billing begins now)
# and opens a secure tunnel so SoulSonus running on your local machine can
# reach the inference services without exposing them to the public internet.
set -euo pipefail

INSTANCE_NAME="soulsonus-inference"
ZONE="us-central1-a"

echo "Starting $INSTANCE_NAME (GPU billing begins now)..."
gcloud compute instances start "$INSTANCE_NAME" --zone="$ZONE"

echo "Waiting for the inference stack to come up (drivers already installed after first boot, this should be under a minute)..."
sleep 20

echo ""
echo "Opening IAP tunnels (requires 'gcloud services enable iap.googleapis.com'"
echo "once per project, and the 'IAP-secured Tunnel User' IAM role on your account)."
echo "Leave this running in its own terminal for the duration of your session."
echo ""

gcloud compute start-iap-tunnel "$INSTANCE_NAME" 8001 \
  --local-host-port=localhost:8001 --zone="$ZONE" &
gcloud compute start-iap-tunnel "$INSTANCE_NAME" 8010 \
  --local-host-port=localhost:8010 --zone="$ZONE" &

wait
