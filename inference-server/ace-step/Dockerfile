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

WORKDIR /app
RUN git clone --depth 1 https://github.com/ace-step/ACE-Step-1.5.git .
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
