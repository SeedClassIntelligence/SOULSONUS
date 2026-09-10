# Shared settings for create-vm.sh, start.sh, stop.sh and preflight.sh.
#
# These used to be four separate copies of the same two literals. Moving the
# VM to another zone -- which is what you do when GPU quota is granted
# somewhere other than us-central1 -- meant editing three files and finding
# out you missed one when stop.sh could not see the instance start.sh had
# just launched.
#
# Override any of them without editing this file:
#   ZONE=us-west1-b ./create-vm.sh
# or put them in gcp/.env, which is read below and is gitignored:
#   ZONE=us-west1-b
#   GPU_METRIC=NVIDIA_L4_GPUS

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -f "$SCRIPT_DIR/.env" ] && set -a && . "$SCRIPT_DIR/.env" && set +a

INSTANCE_NAME="${INSTANCE_NAME:-soulsonus-inference}"
ZONE="${ZONE:-us-central1-a}"
REGION="${ZONE%-*}"

MACHINE_TYPE="${MACHINE_TYPE:-n1-standard-4}"
ACCELERATOR="${ACCELERATOR:-type=nvidia-tesla-t4,count=1}"

# The quota metric that must be above zero for ACCELERATOR to start. Change
# both together: an L4 needs NVIDIA_L4_GPUS and a g2- machine type.
GPU_METRIC="${GPU_METRIC:-NVIDIA_T4_GPUS}"

BOOT_DISK_SIZE="${BOOT_DISK_SIZE:-100GB}"
# The disk bills whether or not the VM is running. At us-central1 list price
# 100GB is about $17/month on pd-ssd and about $10/month on pd-balanced. If
# this VM sits stopped between sessions -- which is the point of start.sh and
# stop.sh -- pd-balanced is the cheaper default and the speed difference only
# shows while loading weights at boot.
BOOT_DISK_TYPE="${BOOT_DISK_TYPE:-pd-ssd}"
