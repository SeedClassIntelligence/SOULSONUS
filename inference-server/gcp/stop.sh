#!/bin/bash
# Run this when you're done with a session. Stops GPU/CPU billing.
# (Kill the tunnels from start.sh with Ctrl+C first, or they'll just
# fail silently once the VM is stopped -- harmless either way.)
set -euo pipefail

INSTANCE_NAME="soulsonus-inference"
ZONE="us-central1-a"

gcloud compute instances stop "$INSTANCE_NAME" --zone="$ZONE"

echo "Stopped. You're no longer being billed for GPU or CPU time."
echo ""
echo "The boot disk still bills while the VM is stopped. 100GB of pd-ssd is"
echo "roughly \$17/month at us-central1 list price -- not 'a few cents', which"
echo "is what this script used to say. If the VM will sit unused for weeks,"
echo "either recreate it with --boot-disk-type=pd-balanced (about \$10/month)"
echo "or delete it and re-run create-vm.sh when you next need it:"
echo "  gcloud compute instances delete soulsonus-inference --zone=us-central1-a"
echo ""
echo "Verify current prices at https://cloud.google.com/compute/disks-image-pricing"
