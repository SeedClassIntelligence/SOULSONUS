# SoulSonus Self-Hosted Inference Stack

Two real, open-source, MIT-licensed model services that replace what the
code audit found to be fabricated: ACE-Step 1.5 (music generation) and
Demucs v4 (stem separation). Nothing here is a stand-in or a mock — this
runs the actual upstream projects.

- **ACE-Step 1.5** — github.com/ace-step/ACE-Step-1.5 — MIT license
- **Demucs v4** — github.com/adefossez/demucs — MIT license

Both are designed by their own maintainers to be self-hostable and run on
consumer hardware, which lines up with the "we have the right to use open
source, and I want other people to be able to self-host this too" goal —
this isn't a compromise architecture, it's the intended way to run these
projects.

## The honest hardware/cost picture

| Setup | ACE-Step generation speed | Cost |
|---|---|---|
| No GPU (CPU only) | Works, but slow (expect well over a minute per song) | $0 — runs on hardware you already have |
| Budget GPU (e.g. RTX 3060, 6-8GB VRAM) | A few seconds to ~10s per song | ~$0.15–0.30/day if renting one hourly in the cloud, or one-time ~$200–300 used if buying |
| Better GPU (RTX 3090/4090, 24GB) | Under 2 seconds per song | Higher one-time cost, but near-instant generation |

Demucs is lighter than ACE-Step and runs acceptably on CPU alone for
most users — a GPU helps but isn't required the way it more meaningfully
helps ACE-Step.

**Bottom line for "minimize cost, self-host, let others self-host too":**
default to CPU-only for anyone testing this out or running it casually —
it costs nothing and genuinely works, just slower. Add a cheap GPU only
once generation speed actually matters to your workflow.

## Where the model weights actually live

**Not in any git repository, including a fork of ACE-Step.** Cloning
ACE-Step gets you the code; the ~10GB of weights download from HuggingFace
(or ModelScope) on the first request and land in `checkpoints/`. So:

- A copy of the ACE-Step repo on your own machine almost certainly has **no**
  weights. Check: `du -sh checkpoints/` inside it — a few hundred KB or a
  missing directory means code only.
- You do **not** need to upload anything to the VM. It downloads them itself
  over Google's network in minutes; pushing 10GB up from a home connection
  takes hours.
- A **fork changes nothing about weights.** Build upstream unless you have
  actually modified ACE-Step. If you have, say so once in
  `inference-server/.env` and never think about it again:

  ```bash
  ACE_STEP_REPO=https://github.com/YOUR_USER/ACE-Step-1.5.git
  ACE_STEP_REF=main
  ```

## No GPU of your own? Rent one — the scripts are already here

`gcp/` has the whole path and nothing in this file used to point at it.
**You do not upload anything.** The VM clones this repo and downloads the
~10GB of ACE-Step weights itself on first boot.

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
cd inference-server/gcp
./preflight.sh          # first. Checks everything the next line assumes
./create-vm.sh          # once. n1-standard-4 + 1x NVIDIA T4, us-central1-a
./start.sh              # before a session. Starts the VM and tunnels 8001/8010
./stop.sh               # after. Stops GPU and CPU billing
```

`preflight.sh` changes nothing. It checks sign-in, project, billing link, the
compute and IAP APIs, your GPU quota in the region, whether the VM already
exists, and whether your account holds the IAM role `start.sh`'s tunnels need
— and for anything missing it prints the single command that fixes it. Each of
those otherwise surfaces as a raw gcloud error partway through creating a VM,
which is the worst place to find out.

On Windows run these from Git Bash or WSL.

### Cloud Shell is fine for creating the VM. It cannot carry the tunnel.

`preflight.sh` and `create-vm.sh` are happiest in Cloud Shell — gcloud is
already there and already signed in:

```bash
git clone https://github.com/SeedClassIntelligence/SOULSONUS.git
cd SOULSONUS/inference-server/gcp

# Run a branch instead of main -- the VM checks out whatever this says.
echo "SOULSONUS_BRANCH=main" > .env

./preflight.sh
./create-vm.sh
./start.sh --vm-only                # boots the VM, opens no tunnel
```

The VM re-checks-out that branch on **every** boot, not just the first, so a
machine started next month runs what the repository says then. It is passed as
instance metadata; nothing about it is baked into the disk image.

**The tunnel has to run on the computer where SoulSonus itself runs.**
`start.sh` terminates the tunnel on `localhost`, and Cloud Shell's localhost is
not your desktop — run it there and the studio keeps reporting both engines
unreachable while a GPU bills by the minute. `start.sh` detects Cloud Shell and
refuses to open a tunnel that would go nowhere, printing the two commands to
run on your own machine instead.

`stop.sh` works from anywhere. It talks to the API, not to a tunnel.

All four scripts read `gcp/config.sh`, so the zone, machine type and quota
metric are set in one place. Change them per-machine in `gcp/.env`, which is
gitignored — this matters because **GPU quota is granted per region**, and a
quota approved somewhere other than `us-central1` means moving the VM:

```bash
# gcp/.env
ZONE=us-west1-b
```

An L4 instead of a T4 — 2–3× faster, roughly double the hourly rate, and it
needs its own quota:

```bash
# gcp/.env
MACHINE_TYPE=g2-standard-4
ACCELERATOR=type=nvidia-l4,count=1
GPU_METRIC=NVIDIA_L4_GPUS
```

`start.sh` opens IAP tunnels so the services appear on **your** machine at
`localhost:8001` and `localhost:8010` — the addresses SoulSonus already uses.
Nothing in the app needs reconfiguring, and the inference API is never exposed
to the open internet.

### The GPU quota gate

**A free trial billing account cannot hold GPU quota at all**, and a paid one
still starts at zero in most regions until it is requested. Upgrading to paid
does not spend leftover trial credits — they remain and are consumed before
any charge. `preflight.sh` reads the real number; on its own that is:

```bash
gcloud compute regions describe us-central1 \
  --flatten="quotas[]" --format="value(quotas.metric,quotas.limit)" | grep -i gpu
```

A limit of `0` means quota, not billing, is the blocker. Request it at
IAM & Admin → Quotas → filter `NVIDIA_T4_GPUS` → your region → Edit Quotas.
Approval is usually minutes, occasionally a day.

### What it costs while it runs

Approximate us-central1 list prices — **verify at
https://cloud.google.com/compute/gpus-pricing before relying on any number
here**, because GPU pricing changes:

| | rough hourly | what $229 of credit buys |
|---|---|---|
| n1-standard-4 + 1× T4 | ~$0.55/hr | ~400 hours of session time |
| g2-standard-4 + 1× L4 (2–3× faster) | ~$0.85/hr | ~270 hours |
| Same, as a Spot VM | 60–70% less | proportionally more, can be preempted mid-job |

Those are *running* hours, not wall-clock. Started before a session and
stopped after, a few hours a day makes this last months.

The one cost that accrues whether or not you are working is the boot disk:
100GB of pd-ssd is roughly **$17/month**, pd-balanced roughly $10. `stop.sh`
prints how to shrink or delete it.

Free trial credits expire — check the expiry date in Billing → Credits, since
that is what decides whether to spend them now or later.

## Quick start (Linux/Windows with an NVIDIA GPU, via Docker)

```bash
cd inference-server
cp .env.example .env      # defaults are fine to start
docker compose up -d
docker compose logs -f    # first ACE-Step request downloads ~10GB of
                           # model weights automatically -- this is
                           # normal and only happens once
```

Then run SoulSonus with the ACE endpoint in its environment, and open it:

```bash
npm run build          # builds the app and server.js
ACE_STEP_ENDPOINT=http://localhost:8001 npm start
```

**The ACE endpoint belongs to the server, not the browser.** ACE's own
`route_setup.py` admits only localhost origins, so a deployed page calling
it directly is refused before the model is consulted — and an endpoint or
an API key in a client bundle is a key anyone can read. SoulSonus's own
`/api/e05` route holds both and does the talking:

| Variable | Default | What it is |
|---|---|---|
| `ACE_STEP_ENDPOINT` | `http://localhost:8001` | Where ACE-Step is listening. Empty means realization is not configured, and the studio says so. |
| `ACESTEP_API_KEY` | *(none)* | Sent only if set. Never reaches the browser. |
| `ACESTEP_API_KEY_HEADER` | `Authorization` | Which header carries it. |
| `ACESTEP_API_KEY_FORMAT` | `Bearer {key}` | How it is written. |
| `PORT` | `8080` | Where SoulSonus itself listens. |

Demucs is different: `src/lib/inference/inferenceSettings.ts` keeps its
endpoint (default `http://localhost:8010`) because the browser reaches it
directly. Change that one in the app's own settings if you run it
elsewhere.

Once it is running, check the whole path in one command:

```bash
node scripts/live-verification/verify-real-ace.mjs http://localhost:8080
```

It submits a short job through SoulSonus's own route, watches it, fetches the
audio back and confirms that a path the service never issued is refused. A
host without its weights fails the generation and prints the host's own
reason — which is a pass for the route and a fail for the deployment, and it
says which is which.

**Which checkpoint to run matters.** Every DiT model does text2music, cover
and repaint; only `acestep-v15-base` and `acestep-v15-xl-base` also do
extract, lego and complete. SoulSonus routes to cover, repaint and extract,
so running an `sft` or `turbo` checkpoint silently costs you stem
extraction. `base` (2B) is the light one that still does all six.

## Native install (no GPU, Mac, or AMD — don't use the ace-step Docker image)

The `ace-step` Dockerfile in this directory targets NVIDIA CUDA
specifically. If you're on a Mac (Apple Silicon), an AMD GPU, or have no
GPU at all, ACE-Step's own official launch scripts handle those cases
better than a Docker image reasonably could:

```bash
git clone https://github.com/ace-step/ACE-Step-1.5.git
cd ACE-Step-1.5
curl -LsSf https://astral.sh/uv/install.sh | sh   # installs uv
uv sync
uv run acestep-api   # starts the REST API on port 8001
```

On CPU-only systems, force DiT-only mode (skips the language-model
component, which is the slower/heavier part) for meaningfully faster
generation:

```bash
ACESTEP_INIT_LLM=false uv run acestep-api
```

The Demucs service (`demucs-service/`) in this directory is plain Python +
FastAPI and works the same way on any platform:

```bash
cd demucs-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8010
```

## Redistributing this to other self-hosters

Everything needed to reproduce this setup is in this directory and
committed to the repo:
- `docker-compose.yml` + both `Dockerfile`s for the one-command path
- This README's native-install path for GPU-less / Mac / AMD users
- `.env.example` documents every configuration knob

Model weights are intentionally **not** committed to the repo or baked
into the Docker images — they're ~10GB and download automatically on
first run from HuggingFace (or ModelScope, set `ACESTEP_DOWNLOAD_SOURCE=
modelscope` in `.env` if HuggingFace access is restricted in your
region). This keeps the repo and Docker images small and means anyone
who clones this repository can stand up their own instance without
needing to be handed model files separately.

## What changed in the SoulSonus app to use this

- `src/lib/inference/aceStepClient.ts` — real client for ACE-Step's own
  async REST API (`/release_task`, `/query_result`)
- `src/lib/inference/demucsClient.ts` — real client for the Demucs
  service above
- `src/lib/inference/audioPreservationScoring.ts` — real preservation
  scoring computed from actually-decoded audio (replaces the hardcoded
  literal score objects the audit flagged in `realizationRouter.ts`)
- `src/lib/inference/inferenceSettings.ts` — user-configurable endpoint
  URLs, same pattern as the existing Ollama configuration
- `src/lib/realizationRouter.ts` — `createCandidate` is now `async` and
  genuinely calls the above for `ACE_PERFORMANCE_TRANSFER` requests
  instead of returning a constant

## Known follow-up (not done yet, flagged rather than silently skipped)

- Pitch-contour/articulation scoring currently uses a coarse spectral-
  centroid proxy, not true pitch tracking (see the comment in
  `audioPreservationScoring.ts`). It's a real measurement of the real
  audio, just a cruder one than rhythm/timing. A proper pitch-tracking
  pass (e.g. autocorrelation or a small ONNX pitch model, similar to
  what's already attempted for the E03 transcription engine) would
  improve this.
- `DemucsStemSeparator` in `src/server/e05_realization_service.py` (the
  disconnected Python test harness the audit flagged) has not been
  updated — the real fix was wiring the actual shipped app
  (`realizationRouter.ts`) to real services, which is what creators
  actually use. The qualification suite should be rewritten to test
  against these real services next, rather than the old self-contained
  Python mock.
- The SAMPLE/INSTRUMENT/SYNTH routes still use constant scores. As
  documented in `realizationRouter.ts`, these are deterministic-by-
  construction approximations (not fabrications), but a future pass
  could measure them directly from rendered audio too, the same way
  ACE_PERFORMANCE_TRANSFER now does.
