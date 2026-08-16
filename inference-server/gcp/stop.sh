#!/bin/bash
# Run this when you're done with a session. Stops GPU/CPU billing.
# (Kill the tunnels from start.sh with Ctrl+C first, or they'll just
# fail silently once the VM is stopped -- harmless either way.)
set -euo pipefail

INSTANCE_NAME="soulsonus-inference"
ZONE="us-central1-a"

gcloud compute instances stop "$INSTANCE_NAME" --zone="$ZONE"

echo "Stopped. You're no longer being billed for GPU or CPU time --"
echo "only the boot disk (a few cents/month for 100GB pd-ssd)."
