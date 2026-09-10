# ACE-Step 1.5 official REST API server, containerized.
#
# This builds the REAL upstream project (github.com/ace-step/ACE-Step-1.5,
# MIT licensed) -- not a reimplementation. We don't need to write our own
# music-generation code; ACE-Step already ships its own async REST API
# (`acestep-api`, port 8001: POST /release_task, POST /query_result).
# Our job is just to containerize it and wire SoulSonus to call it for real.
#
# This Dockerfile targets NVIDIA CUDA GPUs (the common self-host case).
# If you're on a Mac (Apple Silicon/MLX), AMD (ROCm), or a machine with no
# GPU at all, don't use this Dockerfile -- follow the "Native install"
# section in inference-server/README.md instead and point SoulSonus's
# ACE_STEP_ENDPOINT at wherever you run `uv run acestep-api` natively.
# ACE-Step's own platform-specific launch scripts already handle those
# cases better than a Docker image reasonably could.

FROM nvidia/cuda:12.4.1-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 python3.11-venv python3-pip git curl ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"

# Which ACE-Step to build. Defaults to the official upstream project; point
# it at a fork by setting ACE_STEP_REPO in inference-server/.env. Nothing
# here needs a fork -- upstream is the right default, and this exists so
# choosing otherwise is one line rather than an edit to this file.
ARG ACE_STEP_REPO=https://github.com/ace-step/ACE-Step-1.5.git
ARG ACE_STEP_REF=main

WORKDIR /app
RUN git clone --depth 1 --branch "$ACE_STEP_REF" "$ACE_STEP_REPO" .
RUN uv sync

# Model weights (~10GB) are NOT baked into this image on purpose -- that
# would make the image huge and slow to distribute. They download
# automatically from HuggingFace (or ModelScope, for users without easy
# HuggingFace access) on first request, into the volume mounted at
# /app/checkpoints (see docker-compose.yml). This means the image itself
# stays small and redistributable; only the first real request is slow.

EXPOSE 8001
ENV SERVER_NAME=0.0.0.0
ENV PORT=8001

CMD ["uv", "run", "acestep-api"]
