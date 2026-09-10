#!/bin/bash
# Run this ONCE from your own machine (with `gcloud` installed and
# authenticated: `gcloud auth login`, `gcloud config set project YOUR_PROJECT_ID`)
# to create the VM. It does not start incurring GPU charges until the VM is
# actually running -- see start.sh / stop.sh for day-to-day use.
#
# Defaults to a T4 GPU (n1-standard-4 + 1x T4), the cheapest GCP GPU tier
# that comfortably covers ACE-Step's ~4GB minimum VRAM requirement plus
# Demucs. Every setting lives in config.sh, which all four scripts read --
# so a zone or machine change is one edit, not three files and a missed one.
#
# For roughly 2-3x the speed at roughly double the hourly cost, put this in
# gcp/.env (and request the matching quota first -- see preflight.sh):
#   MACHINE_TYPE=g2-standard-4
#   ACCELERATOR=type=nvidia-l4,count=1
#   GPU_METRIC=NVIDIA_L4_GPUS
#
# GPU pricing changes; verify at https://cloud.google.com/compute/gpus-pricing
# before relying on any number in this repository.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/config.sh"

gcloud compute instances create "$INSTANCE_NAME" \
  --zone="$ZONE" \
  --machine-type="$MACHINE_TYPE" \
  --accelerator="$ACCELERATOR" \
  --maintenance-policy=TERMINATE \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size="$BOOT_DISK_SIZE" \
  --boot-disk-type="$BOOT_DISK_TYPE" \
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
echo "when you're done with a session -- a stopped VM bills for its boot disk"
echo "only, not GPU or CPU time. That disk is not free: 100GB of pd-ssd is"
echo "about \$17/month. stop.sh says how to reduce or remove it."
