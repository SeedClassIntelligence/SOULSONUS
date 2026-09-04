/**
 * A stand-in for the ACE-Step 1.5 HTTP API, for testing the service route.
 *
 * This is NOT a model and must never be mistaken for one. It generates no
 * music: it answers ACE's wire protocol with a fixed tone so the plumbing
 * between the browser, the service route and a host can be proven without ten
 * gigabytes of weights and a GPU. What it verifies is that our request lands
 * on ACE's field names, that its integer status is read correctly, and that a
 * produced file comes back as bytes. What it cannot verify is anything about
 * realization quality, because nothing here realizes anything.
 *
 * The shapes are the documented ones (docs/en/API.md):
 *   POST /release_task  -> { data: { task_id, status, queue_position }, code, error }
 *   POST /query_result  -> { data: [ { task_id, status: 0|1|2, result: "<json>" } ] }
 *   GET  /v1/audio?path -> the bytes
 */
import http from 'node:http';
import { Buffer } from 'node:buffer';

const PORT = Number(process.env.STUB_PORT || 8099);
/** How many polls a job stays running, so the client's polling loop is exercised. */
const RUNNING_POLLS = Number(process.env.STUB_RUNNING_POLLS || 1);

const jobs = new Map();
/** Everything the route sent, so a test can assert the mapping rather than trust it. */
const received = [];

function toneWav(seconds = 1, freq = 440, rate = 16000) {
  const n = Math.floor(seconds * rate);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * freq * i) / rate) * 12000), 44 + i * 2);
  }
  return buf;
}

const AUDIO = toneWav();

const readBody = (req) =>
  new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });

const send = (res, code, body) => {
  const text = JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(text);
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://local');

    if (url.pathname === '/release_task' && req.method === 'POST') {
      const raw = await readBody(req);
      const type = req.headers['content-type'] || '';
      let fields = {};
      let audioBytes = 0;
      let audioName = null;
      if (type.includes('multipart/form-data')) {
        const form = await new Request('http://local/', {
          method: 'POST',
          headers: { 'content-type': type },
          body: raw,
        }).formData();
        for (const [k, v] of form.entries()) {
          if (typeof v === 'string') fields[k] = v;
          else {
            audioBytes = v.size;
            audioName = v.name;
          }
        }
      } else {
        try {
          fields = JSON.parse(raw.toString('utf8'));
        } catch {
          fields = {};
        }
      }
      const taskId = `stub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      received.push({ taskId, fields, audioBytes, audioName, auth: req.headers.authorization || null });
      jobs.set(taskId, { polls: 0 });
      return send(res, 200, {
        data: { task_id: taskId, status: 'queued', queue_position: 0 },
        code: 200,
        error: null,
      });
    }

    if (url.pathname === '/query_result' && req.method === 'POST') {
      const raw = await readBody(req);
      let ids = [];
      try {
        ids = JSON.parse(raw.toString('utf8')).task_id_list || [];
      } catch {
        ids = [];
      }
      const data = ids.map((id) => {
        const job = jobs.get(id);
        if (!job) {
          return {
            task_id: id,
            status: 2,
            result: JSON.stringify([{ file: '', status: 2, stage: 'failed', error: 'no such task' }]),
          };
        }
        job.polls++;
        if (job.polls <= RUNNING_POLLS) return { task_id: id, status: 0, result: '' };
        return {
          task_id: id,
          status: 1,
          // An ARRAY, which is what a live server returns -- a job can be a
          // batch. This stub returned the object shape the published API
          // reference shows, and a route written against it read `file` off an
          // array and found nothing on every successful job. The fixture now
          // matches the server rather than the documentation.
          result: JSON.stringify([
            {
              // The URL-shaped form, which is one of the two shapes ACE
              // returns and the one that needs unwrapping.
              file: `/v1/audio?path=${encodeURIComponent(`/tmp/stub/${id}.wav`)}`,
              wave: '',
              status: 1,
              stage: 'succeeded',
              seed_value: '4242,4242',
              model: 'stub-not-a-model',
              metas: { bpm: 120, duration: 1.0, keyscale: 'C major', timesignature: '4/4' },
            },
          ]),
        };
      });
      return send(res, 200, { data });
    }

    if (url.pathname === '/v1/audio') {
      const p = url.searchParams.get('path') || '';
      if (!/^\/tmp\/stub\//.test(p)) return send(res, 404, { error: 'no such file' });
      res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': AUDIO.byteLength });
      return res.end(AUDIO);
    }

    // A test hook, not part of ACE: what did the route actually send?
    if (url.pathname === '/__received') return send(res, 200, received);

    send(res, 404, { error: 'not found' });
  })
  .listen(PORT, () => console.log(`ace-stub (NOT a model) on :${PORT}`));
