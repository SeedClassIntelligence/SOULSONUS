#!/bin/bash
# Runs automatically when the GCE VM boots (passed via --metadata-from-file
# startup-script=). Installs NVIDIA drivers, Docker, and starts the real
# ACE-Step + Demucs stack. Idempotent -- safe to run on every boot.
set -euo pipefail

log() { echo "[startup-script] $*"; }

# --- 1. NVIDIA driver (Google's Deep Learning VM images have this
#         pre-installed; this is a fallback for a plain Ubuntu image) ---
if ! command -v nvidia-smi &> /dev/null; then
  log "Installing NVIDIA driver..."
  curl -s -o /tmp/install_gpu_driver.py \
    https://raw.githubusercontent.com/GoogleCloudPlatform/compute-gpu-installation/main/linux/install_gpu_driver.py
  python3 /tmp/install_gpu_driver.py
fi
nvidia-smi || log "WARNING: nvidia-smi still not available -- GPU may not be attached to this instance"

# --- 2. Docker + Compose + NVIDIA Container Toolkit ---
if ! command -v docker &> /dev/null; then
  log "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi

if ! dpkg -l | grep -q nvidia-container-toolkit; then
  log "Installing NVIDIA Container Toolkit..."
  curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
  curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
  apt-get update && apt-get install -y nvidia-container-toolkit
  nvidia-ctk runtime configure --runtime=docker
  systemctl restart docker
fi

# --- 3. Pull the SoulSonus inference stack and start it ---
REPO_DIR=/opt/soulsonus

# Which branch to run. Set by create-vm.sh from SOULSONUS_BRANCH in config.sh
# and read back from the metadata server, so a rebuild does not silently fall
# back to the default branch.
BRANCH=$(curl -sf -H "Metadata-Flavor: Google" \
  "http://metadata.google.internal/computeMetadata/v1/instance/attributes/soulsonus-branch" || true)
BRANCH="${BRANCH:-main}"
log "Branch: $BRANCH"

if [ ! -d "$REPO_DIR" ]; then
  log "Cloning SoulSonus repo..."
  git clone https://github.com/SeedClassIntelligence/SOULSONUS.git "$REPO_DIR"
fi

# Every boot, not just the first: a VM started next month should be running
# what the repository says today, not what it said when it was created.
cd "$REPO_DIR"
git fetch --all --prune || log "WARNING: fetch failed -- running whatever is already on disk"
git checkout "$BRANCH" || log "WARNING: could not check out $BRANCH"
git pull --ff-only origin "$BRANCH" || log "WARNING: could not fast-forward $BRANCH"

cd "$REPO_DIR/inference-server"
[ -f .env ] || cp .env.example .env

log "Starting docker compose stack..."
docker compose up -d --build

log "Startup complete. ACE-Step on :8001, Demucs on :8010."
