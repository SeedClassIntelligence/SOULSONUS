#!/bin/bash
# Run this ONCE from your own machine (with `gcloud` installed and
# authenticated: `gcloud auth login`, `gcloud config set project YOUR_PROJECT_ID`)
# to create the VM. It does not start incurring GPU charges until the VM is
# actually running -- see start.sh / stop.sh for day-to-day use.
#
# Defaults to a T4 GPU (n1-standard-4 + 1x T4), the cheapest GCP GPU tier
# that comfortably covers ACE-Step's ~4GB minimum VRAM requirement plus
# Demucs. If generation feels too slow, edit ACCELERATOR below to
# "type=nvidia-l4,count=1" and MACHINE_TYPE to "g2-standard-4" for roughly
# 2-3x the speed at roughly double the hourly cost (see README.md for
# current pricing references -- GPU pricing changes, verify at
# https://cloud.google.com/compute/gpus-pricing before relying on any
# number here).
set -euo pipefail

INSTANCE_NAME="soulsonus-inference"
ZONE="us-central1-a"            # T4 and L4 are both available here
MACHINE_TYPE="n1-standard-4"
ACCELERATOR="type=nvidia-tesla-t4,count=1"
BOOT_DISK_SIZE="100GB"          # model weights (~10GB) + Docker images + headroom

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

gcloud compute instances create "$INSTANCE_NAME" \
  --zone="$ZONE" \
  --machine-type="$MACHINE_TYPE" \
  --accelerator="$ACCELERATOR" \
  --maintenance-policy=TERMINATE \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size="$BOOT_DISK_SIZE" \
  --boot-disk-type=pd-ssd \
  --metadata-from-file=startup-script="$SCRIPT_DIR/startup-script.sh" \
  --tags=soulsonus-inference

echo ""
echo "VM created. It will take several minutes to finish booting, install"
echo "drivers/Docker, and pull model weights on first boot -- watch progress with:"
echo "  gcloud compute instances get-serial-port-output $INSTANCE_NAME --zone=$ZONE"
echo ""
echo "IMPORTANT -- this VM has no firewall rule allowing inbound traffic to"
echo "ports 8001/8010 yet, so it isn't publicly reachable. See README.md for"
echo "the recommended way to connect (SSH tunnel / IAP), which avoids"
echo "exposing an unauthenticated inference API to the open internet."
echo ""
echo "This VM is billing GPU time RIGHT NOW that it's running. Use stop.sh"
echo "when you're done with a session -- a stopped VM only bills for its"
echo "boot disk (a few cents/month), not GPU or CPU time."
