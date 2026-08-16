# Demucs stem-separation service.
# Builds a CPU-capable image by default so it runs on ANY machine, including
# one with no GPU at all -- important for the "anyone can self-host this"
# goal. If a CUDA GPU is present at runtime and nvidia-container-toolkit is
# installed, torch will detect and use it automatically (see main.py DEVICE
# detection) -- no separate GPU image needed for this service, since Demucs
# is light enough that a single image covering both cases is the simpler,
# more redistributable choice.

FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# Pre-download the default model at build time so the first real request
# isn't the one that pays a multi-hundred-MB download -- comment this out
# if you'd rather keep the image small and download on first use instead.
RUN python -c "import demucs.api; demucs.api.Separator(model='htdemucs')" || true

EXPOSE 8010

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8010"]
