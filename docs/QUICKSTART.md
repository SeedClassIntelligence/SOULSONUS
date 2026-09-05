# Sitting down and recording something

Three sections, in the order you need them. **The first one needs nothing
installed but this repository** — no model weights, no Docker, no GPU. Capture,
classification onto separate channels, editing, mixing, mastering and export all
run locally in the browser.

---

## 1. Record a take (no services required)

```bash
npm install
npm run dev                 # http://localhost:3000
```

Then, in the browser:

1. **ENTER THE STUDIO.**
2. You arrive in **1. CREATE**, on the **UNIFIED DECK** bench. The session opens
   with channels and nothing performed on them — nothing on screen is your work
   until you play something.
3. In the capture row, pick how you are about to perform: **Oral Beatbox**,
   **Clap / Tap**, **Hum / Voice**, **Mimic**, **Sing** or **MIDI Keys**.
   Choosing does not open the microphone.
4. Press **● RECORD LOOP**. The microphone opens, the transient monitor reads
   *MIC RECORDING*, and the waveform beside it draws what it hears.
5. Perform. Hits land on separate channels as they are classified — kick, snare
   and hi-hat go to their own tracks, not to one lane.
6. Press **⏹ STOP RECORDING**. The take is kept: the notes, the audio, and a
   seed track that holds the performance itself.
7. Press **play** in the transport to hear it back.

If the microphone will not open, the capture row says so in words rather than
pulsing at you. Browsers only allow microphone access on `localhost` or over
HTTPS — `http://` on another machine's IP will be refused by the browser, not
by SoulSonus.

**What you can do from here with no services running:** edit notes and steps,
re-read the take under a different timing mode, adjust the mix, run the
mastering chain, and export 24-bit and 16-bit WAV, FLAC, per-track stems, a zip
and a provenance record.

---

## 2. Turn on the two engines

Two self-hosted, open-source services. Neither is bundled and neither is
required to record.

| service | what it does | needs |
|---|---|---|
| **ACE-Step 1.5** | realization: performs your take as another instrument or arrangement | ~10 GB of weights on first request; GPU strongly preferred |
| **Demucs v4** | stem separation: splits a finished mix into parts | CPU is fine, slower |

```bash
cd inference-server
cp .env.example .env          # edit if you want an API key or different ports
docker compose up -d
docker compose logs -f        # the first ACE-Step request downloads the weights
```

Then ask what is actually connected, from the addresses the app uses:

```bash
npm run engines:check
```

It prints one line per service — connected, or not reachable with the command
that would fix it. It starts nothing and downloads nothing.

No GPU, or on a Mac? Run ACE-Step natively instead of in the container — see
`inference-server/README.md`, "Native install". Demucs is fine in the container
either way.

---

## 3. Point SoulSonus at them

The browser never talks to ACE-Step directly. It goes through SoulSonus's own
service route, which holds the endpoint and any API key server-side, so the
address and key never reach the page.

```bash
npm run build
ACE_STEP_ENDPOINT=http://localhost:8001 npm start     # http://localhost:8080
```

Stem separation is called from the browser and defaults to
`http://localhost:8010`; change it in the app's inference settings if your
Demucs runs elsewhere.

Check the whole path in one command:

```bash
ACE_STEP_ENDPOINT=http://localhost:8001 npm run engines:check
```

When the **Service route** line reads *connected*, realization is reachable from
inside the app. Until then the app says NO ANSWER in its own surfaces — which is
the truth, not a bug: nothing is fabricated when a host is missing.

---

## If something is not working

- `npm run engines:check` — what is connected, right now, and what to run.
- `npx tsc --noEmit` — the source is expected to be clean.
- `npm run seed:audit` — conformance against the seed corpus.
- `node scripts/live-verification/test-50-record-and-click.cjs` — drives the real
  app in a real browser and records a real take. If this passes, recording works.
