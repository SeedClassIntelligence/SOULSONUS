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
