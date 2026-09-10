#!/bin/bash
# Everything create-vm.sh and start.sh assume, checked before they fail on it.
#
# Each of these is a real stop that produces a raw gcloud error somewhere in
# the middle of creating a VM, which is the worst place to find out. Nothing
# here changes anything -- it reports, and prints the one command that fixes
# whatever it found.
#
#   ./preflight.sh
set -uo pipefail

INSTANCE_NAME="${INSTANCE_NAME:-soulsonus-inference}"
ZONE="${ZONE:-us-central1-a}"
REGION="${ZONE%-*}"
GPU_METRIC="${GPU_METRIC:-NVIDIA_T4_GPUS}"

G="\033[32m"; R="\033[31m"; A="\033[33m"; D="\033[2m"; B="\033[1m"; O="\033[0m"
problems=0

ok()   { printf "  ${G}✓${O} %s\n" "$1"; }
bad()  { problems=$((problems+1)); printf "  ${R}✗${O} %s\n" "$1"; [ -n "${2:-}" ] && printf "    ${D}%s${O}\n" "$2"; }
warn() { printf "  ${A}•${O} %s\n" "$1"; [ -n "${2:-}" ] && printf "    ${D}%s${O}\n" "$2"; }

printf "\n${B}  SOULSONUS — GOOGLE CLOUD PREFLIGHT${O}\n\n"

# --- gcloud itself -------------------------------------------------------
if ! command -v gcloud >/dev/null 2>&1; then
  bad "gcloud is not installed." "https://cloud.google.com/sdk/docs/install"
  printf "\n  ${R}Stopping here — nothing else can be checked without it.${O}\n\n"
  exit 1
fi
ok "gcloud installed ($(gcloud version 2>/dev/null | head -1))"

ACCOUNT=$(gcloud config get-value account 2>/dev/null)
[ -n "$ACCOUNT" ] && [ "$ACCOUNT" != "(unset)" ] \
  && ok "signed in as $ACCOUNT" \
  || bad "not signed in." "gcloud auth login"

PROJECT=$(gcloud config get-value project 2>/dev/null)
[ -n "$PROJECT" ] && [ "$PROJECT" != "(unset)" ] \
  && ok "project: $PROJECT" \
  || bad "no project set." "gcloud config set project YOUR_PROJECT_ID"

if [ -z "$PROJECT" ] || [ "$PROJECT" = "(unset)" ]; then
  printf "\n  ${R}Stopping — every check below needs a project.${O}\n\n"
  exit 1
fi

# --- billing -------------------------------------------------------------
# `gcloud billing` is GA; `gcloud beta billing` is the fallback for older SDKs
# and would otherwise prompt to install a component mid-check.
BILLING=$(gcloud billing projects describe "$PROJECT" \
  --format="value(billingEnabled)" 2>/dev/null \
  || gcloud beta billing projects describe "$PROJECT" \
  --format="value(billingEnabled)" 2>/dev/null)
case "$BILLING" in
  True|true) ok "billing is linked to $PROJECT" ;;
  False|false) bad "billing is NOT linked to $PROJECT." \
      "Console → Billing → link this project to your billing account. Credits follow the billing account, not the project." ;;
  *) warn "could not read billing status." "gcloud services enable cloudbilling.googleapis.com" ;;
esac

# --- APIs ----------------------------------------------------------------
ENABLED=$(gcloud services list --enabled --format="value(config.name)" 2>/dev/null)
for api in compute.googleapis.com iap.googleapis.com; do
  if grep -q "^$api$" <<<"$ENABLED"; then
    ok "$api enabled"
  else
    bad "$api is not enabled." "gcloud services enable $api"
  fi
done

# --- GPU quota -----------------------------------------------------------
# The one that stops create-vm.sh dead. A paid account still starts at zero
# in most regions until the quota is requested; the free trial cannot hold
# any at all.
QUOTA=$(gcloud compute regions describe "$REGION" \
  --flatten="quotas[]" \
  --format="value(quotas.metric,quotas.limit)" 2>/dev/null \
  | awk -v m="$GPU_METRIC" '$1 == m { print $2; exit }')
case "$QUOTA" in
  "")      warn "could not read $GPU_METRIC quota for $REGION." "Check IAM & Admin → Quotas in the console." ;;
  0|0.0)   bad "$GPU_METRIC quota in $REGION is 0 — the VM will not start." \
              "IAM & Admin → Quotas → filter '$GPU_METRIC' → region $REGION → Edit Quotas → request 1." ;;
  *)       ok "$GPU_METRIC quota in $REGION: ${QUOTA%.*}" ;;
esac

# --- does the VM already exist? -----------------------------------------
STATE=$(gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" \
  --format="value(status)" 2>/dev/null)
if [ -n "$STATE" ]; then
  ok "$INSTANCE_NAME already exists in $ZONE — status $STATE"
  printf "    ${D}Don't run create-vm.sh again. Use ./start.sh and ./stop.sh.${O}\n"
else
  printf "  ${D}·${O} %s\n" "$INSTANCE_NAME does not exist yet — create-vm.sh will make it."
fi

# --- the IAM role start.sh needs ----------------------------------------
if [ -n "$ACCOUNT" ] && [ "$ACCOUNT" != "(unset)" ]; then
  ROLES=$(gcloud projects get-iam-policy "$PROJECT" \
    --flatten="bindings[].members" \
    --filter="bindings.members:$ACCOUNT" \
    --format="value(bindings.role)" 2>/dev/null)
  if grep -qE "roles/(owner|iap.tunnelResourceAccessor)" <<<"$ROLES"; then
    ok "your account can open IAP tunnels"
  else
    warn "no IAP tunnel role found for $ACCOUNT — start.sh's tunnels may be refused." \
      "gcloud projects add-iam-policy-binding $PROJECT --member=user:$ACCOUNT --role=roles/iap.tunnelResourceAccessor"
  fi
fi

printf "\n"
if [ "$problems" -eq 0 ]; then
  printf "  ${G}${B}Ready.${O} Next: ./create-vm.sh   (then ./start.sh before each session)\n\n"
  exit 0
fi
printf "  ${R}${B}%d thing(s) to fix above before create-vm.sh will work.${O}\n\n" "$problems"
exit 1
