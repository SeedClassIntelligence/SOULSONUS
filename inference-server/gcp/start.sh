#!/bin/bash
# Run this before a studio session. Starts the VM (GPU billing begins now)
# and opens a secure tunnel so SoulSonus can reach the inference services
# without exposing them to the public internet.
#
#   ./start.sh              start the VM, then tunnel
#   ./start.sh --vm-only    start the VM and stop there
#
# WHERE YOU RUN THIS MATTERS. The tunnel terminates on localhost -- whichever
# machine's localhost that is. Run it in Cloud Shell and the services land on
# Cloud Shell, not on the computer where SoulSonus is running, and the studio
# goes on reporting both engines unreachable while a GPU bills by the minute.
# Creating the VM can happen anywhere; the tunnel belongs on the machine
# running the studio.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$SCRIPT_DIR/config.sh"

VM_ONLY=0
[ "${1:-}" = "--vm-only" ] && VM_ONLY=1

# Cloud Shell announces itself; both variables have been used over time.
IN_CLOUD_SHELL=0
[ -n "${CLOUD_SHELL:-}${GOOGLE_CLOUD_SHELL:-}" ] && IN_CLOUD_SHELL=1

echo "Starting $INSTANCE_NAME in $ZONE (GPU billing begins now)..."
gcloud compute instances start "$INSTANCE_NAME" --zone="$ZONE"

if [ "$VM_ONLY" = "1" ]; then
  echo ""
  echo "VM is starting. No tunnel opened (--vm-only)."
  echo "On the machine running SoulSonus, open the tunnel with:"
  echo "  ./start.sh"
  echo "Remember ./stop.sh when you are done -- the GPU bills while it runs."
  exit 0
fi

if [ "$IN_CLOUD_SHELL" = "1" ]; then
  echo ""
  echo "  This is Cloud Shell. A tunnel opened here reaches Cloud Shell's"
  echo "  localhost, not the computer running SoulSonus -- the studio would"
  echo "  keep reporting both engines unreachable while the GPU billed."
  echo ""
  echo "  The VM is starting. Now, on the computer running SoulSonus:"
  echo ""
  echo "    gcloud compute start-iap-tunnel $INSTANCE_NAME 8001 \\"
  echo "      --local-host-port=localhost:8001 --zone=$ZONE &"
  echo "    gcloud compute start-iap-tunnel $INSTANCE_NAME 8010 \\"
  echo "      --local-host-port=localhost:8010 --zone=$ZONE &"
  echo ""
  echo "  Or clone this repo there and run ./start.sh."
  echo "  Stop billing from anywhere with ./stop.sh."
  exit 0
fi

echo "Waiting for the inference stack to come up (drivers are already installed after the first boot, so this should be under a minute)..."
sleep 20

echo ""
echo "Opening IAP tunnels (needs 'gcloud services enable iap.googleapis.com'"
echo "once per project, and the 'IAP-secured Tunnel User' role on your account;"
echo "preflight.sh checks both). Leave this running for the whole session."
echo ""

gcloud compute start-iap-tunnel "$INSTANCE_NAME" 8001 \
  --local-host-port=localhost:8001 --zone="$ZONE" &
gcloud compute start-iap-tunnel "$INSTANCE_NAME" 8010 \
  --local-host-port=localhost:8010 --zone="$ZONE" &

wait
