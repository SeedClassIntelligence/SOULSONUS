"""
Transport stand-in for the Demucs stem-separation service.

Speaks the exact protocol of inference-server/demucs-service (GET /health,
POST /separate, GET /stems/<job>/<role>.wav) so the app's whole Case B path can
be exercised: real multipart upload, real job response, real stem files fetched
and decoded.

It is NOT Demucs and makes no claim to separate anything: it band-splits the
uploaded audio into four files. That is enough to prove the app sends the real
file and consumes the real audio it gets back — the stems are genuinely
distinct and genuinely derived from the input — but it says nothing about
separation quality, which is Demucs's job.

Used because this environment cannot download the pretrained htdemucs weights
(the model host is blocked by egress policy), so the real service starts and
answers /health but cannot separate.
"""
import io
import math
import struct
import sys
import uuid
import wave
from pathlib import Path

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/stub-stems")
OUT.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Stem separation transport stub")

# Mirrors the real service, which needs CORS because its client is the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Band edges per role, in Hz. Crude on purpose — this is plumbing, not modelling.
BANDS = {
    "drums": (2000, 16000),
    "bass": (20, 160),
    "other": (160, 900),
    "vocals": (900, 2000),
}


def read_wav(data: bytes):
    with wave.open(io.BytesIO(data), "rb") as w:
        n, ch, sw, sr = w.getnframes(), w.getnchannels(), w.getsampwidth(), w.getframerate()
        raw = w.readframes(n)
    if sw != 2:
        raise ValueError("stub expects 16-bit PCM WAV")
    total = len(raw) // 2
    samples = struct.unpack("<%dh" % total, raw)
    if ch > 1:
        samples = [sum(samples[i:i + ch]) / ch for i in range(0, total, ch)]
    return [s / 32768.0 for s in samples], sr


def biquad(x, b0, b1, b2, a1, a2):
    y = [0.0] * len(x)
    x1 = x2 = y1 = y2 = 0.0
    for i, v in enumerate(x):
        out = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1, y2, y1 = x1, v, y1, out
        y[i] = out
    return y


def bandpass(x, sr, lo, hi):
    def hp(sig, f0):
        w = 2 * math.pi * f0 / sr
        c, al = math.cos(w), math.sin(w) / (2 * 0.707)
        a0 = 1 + al
        return biquad(sig, (1 + c) / 2 / a0, -(1 + c) / a0, (1 + c) / 2 / a0, -2 * c / a0, (1 - al) / a0)

    def lp(sig, f0):
        w = 2 * math.pi * f0 / sr
        c, al = math.cos(w), math.sin(w) / (2 * 0.707)
        a0 = 1 + al
        return biquad(sig, (1 - c) / 2 / a0, (1 - c) / a0, (1 - c) / 2 / a0, -2 * c / a0, (1 - al) / a0)

    out = x
    if lo > 20:
        out = hp(out, lo)
    if hi < sr / 2:
        out = lp(out, min(hi, sr / 2 - 100))
    return out


def write_wav(path, samples, sr):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(b"".join(
            struct.pack("<h", int(max(-1.0, min(1.0, s)) * 32000)) for s in samples
        ))


@app.get("/health")
def health():
    return {"status": "ok", "model": "transport-stub", "device": "cpu",
            "modelLoaded": True, "cudaAvailable": False}


@app.post("/separate")
async def separate(file: UploadFile = File(...)):
    data = await file.read()
    samples, sr = read_wav(data)
    job = uuid.uuid4().hex[:12]
    job_dir = OUT / job
    job_dir.mkdir(parents=True, exist_ok=True)

    stems = {}
    for role, (lo, hi) in BANDS.items():
        band = bandpass(samples, sr, lo, hi)
        path = job_dir / f"{role}.wav"
        write_wav(path, band, sr)
        stems[role] = {"role": role, "url": f"/stems/{job}/{role}.wav",
                       "sizeBytes": path.stat().st_size}

    return JSONResponse({"jobId": job, "engine": "stub", "model": "transport-stub",
                         "device": "cpu", "sampleRate": sr, "stems": stems})


@app.get("/stems/{job}/{role}.wav")
def get_stem(job: str, role: str):
    path = OUT / job / f"{role}.wav"
    if not path.exists():
        return JSONResponse({"detail": "not found"}, status_code=404)
    return FileResponse(str(path), media_type="audio/wav")
