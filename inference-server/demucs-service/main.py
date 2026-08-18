"""
SoulSonus Demucs Stem-Separation Service
==========================================
A thin, real FastAPI wrapper around Meta's official Demucs Python API
(demucs.api.Separator). This replaces the fabricated
`DemucsStemSeparator` that previously shipped in
src/server/e05_realization_service.py, which never read its input
file and returned four canned sine waves regardless of what was
uploaded.

This service actually separates whatever audio it's given.

Endpoints:
  GET  /health              -> service + model status
  POST /separate             -> multipart file upload -> 4 real stems
                                 (drums, bass, other, vocals)

Model: htdemucs (Demucs v4, Hybrid Transformer) by default -- MIT
licensed. Runs on GPU if available (CUDA), falls back to CPU
automatically (slower, but functional -- this is what makes the
service usable by someone self-hosting with no GPU at all).
"""

import os
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import Dict

import torch
import torchaudio
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

import demucs.api

MODEL_NAME = os.environ.get("DEMUCS_MODEL", "htdemucs")  # htdemucs = v4, 4-stem
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
OUTPUT_DIR = Path(os.environ.get("DEMUCS_OUTPUT_DIR", "/data/stems"))
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="SoulSonus Demucs Stem-Separation Service", version="1.0.0")

# The client for this service runs in the browser, so without CORS every
# request from the app is rejected before it reaches an endpoint. Self-hosted
# deployments serve the studio from a different origin (and port) than this
# service by design, so permissive origins are the working default here; narrow
# it with DEMUCS_ALLOWED_ORIGINS when the deployment origin is known.
_allowed = os.environ.get("DEMUCS_ALLOWED_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _allowed.split(",")] if _allowed != "*" else ["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

_separator: demucs.api.Separator | None = None


def get_separator() -> demucs.api.Separator:
    """Lazily loads the real Demucs model on first request (not at import time),
    so /health responds immediately even before the model is warmed up."""
    global _separator
    if _separator is None:
        _separator = demucs.api.Separator(model=MODEL_NAME, device=DEVICE)
    return _separator


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "device": DEVICE,
        "modelLoaded": _separator is not None,
        "cudaAvailable": torch.cuda.is_available(),
    }


@app.post("/separate")
async def separate(file: UploadFile = File(...)) -> Dict:
    """
    Accepts a real audio file, runs real Demucs v4 separation on it,
    and returns real per-stem WAV file paths + a job id.

    Unlike the fabricated version this replaces, the output genuinely
    depends on the input -- feed it silence, you get silence back in
    every stem; feed it a real mix, you get real separated stems.
    """
    job_id = uuid.uuid4().hex[:12]
    job_dir = OUTPUT_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    suffix = Path(file.filename or "input.wav").suffix or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        shutil.copyfileobj(file.file, tmp)
        input_path = tmp.name

    try:
        separator = get_separator()
        # This is the real call -- it actually reads input_path.
        origin, separated = separator.separate_audio_file(input_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Demucs separation failed: {e}")
    finally:
        os.unlink(input_path)

    stems = {}
    for stem_name, waveform in separated.items():
        out_path = job_dir / f"{stem_name}.wav"
        demucs.api.save_audio(waveform, str(out_path), samplerate=separator.samplerate)
        stems[stem_name] = {
            "url": f"/stems/{job_id}/{stem_name}.wav",
            "sizeBytes": out_path.stat().st_size,
        }

    return JSONResponse({
        "jobId": job_id,
        "engine": "Meta Demucs v4 (Hybrid Transformer)",
        "model": MODEL_NAME,
        "device": DEVICE,
        "sourceFilename": file.filename,
        "sampleRate": separator.samplerate,
        "stems": stems,
    })


@app.get("/stems/{job_id}/{stem_filename}")
def get_stem(job_id: str, stem_filename: str):
    path = OUTPUT_DIR / job_id / stem_filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Stem not found")
    return FileResponse(path, media_type="audio/wav")
