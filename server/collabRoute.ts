/**
 * The shared-session relay. Redis on this side, never in the browser.
 *
 * `collaborativeState.ts` has had `SyncTransport` as a declared seam and
 * `unconfiguredTransport` as the only implementation: it reports itself
 * unconfigured rather than pretending, because clause XV.4 exists to stop the
 * collaboration screen showing people who are not there.
 *
 * This is a transport behind that seam. Two things it deliberately is not:
 *
 *   It holds no model. The browser publishes its own state and its own
 *   operations; this stores the last state per project and fans it out.
 *   `mergeStates` and `admit` stay in one place -- a server that merged would
 *   be a second implementation of the rules, free to drift from the first.
 *
 *   It is not reachable as Redis from the page. Redis speaks TCP and a browser
 *   does not, so the address and any credential stay on this side, the same
 *   way the realization endpoint does.
 *
 * With no REDIS_URL set this answers, and says it is unconfigured. That is the
 * honest state of most deployments and it is not an error.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

export interface CollabRouteConfig {
  /** Where Redis is. Empty means collaboration is not configured. */
  redisUrl: string;
  /** How long a project's last state survives with nobody connected. */
  snapshotTtlSeconds: number;
}

export function collabConfigFromEnv(env: NodeJS.ProcessEnv = process.env): CollabRouteConfig {
  return {
    redisUrl: env.REDIS_URL || '',
    snapshotTtlSeconds: Number(env.COLLAB_SNAPSHOT_TTL_SECONDS || 60 * 60 * 24),
  };
}

const KEY = (projectId: string) => `soulsonus:collab:state:${projectId}`;
const CHANNEL = (projectId: string) => `soulsonus:collab:ops:${projectId}`;

/** A project id from a query string, constrained so it cannot shape a key. */
const safeProjectId = (raw: string | null): string | null => {
  if (!raw) return null;
  return /^[A-Za-z0-9_.:-]{1,200}$/.test(raw) ? raw : null;
};

type RedisLike = {
  connect: () => Promise<unknown>;
  quit: () => Promise<unknown>;
  get: (k: string) => Promise<string | null>;
  set: (k: string, v: string, o?: unknown) => Promise<unknown>;
  publish: (c: string, m: string) => Promise<unknown>;
  subscribe: (c: string, cb: (m: string) => void) => Promise<unknown>;
  duplicate: () => RedisLike;
  on: (e: string, cb: (err: unknown) => void) => unknown;
};

/**
 * One shared client for the request path. Created on first use rather than at
 * import, so a build with no Redis configured never opens a socket.
 */
let shared: Promise<RedisLike> | null = null;
async function client(url: string): Promise<RedisLike> {
  if (!shared) {
    shared = (async () => {
      const { createClient } = await import('redis');
      const c = createClient({ url }) as unknown as RedisLike;
      // Without a handler, a dropped connection is an unhandled 'error' event
      // and takes the process with it.
      c.on('error', () => {});
      await c.connect();
      return c;
    })().catch((err) => {
      shared = null;
      throw err;
    });
  }
  return shared;
}

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

const readBody = (req: IncomingMessage, limitBytes = 4 * 1024 * 1024) =>
  new Promise<string>((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > limitBytes) {
        reject(new Error('The published state is larger than this relay accepts.'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

export async function handleCollab(
  req: IncomingMessage,
  res: ServerResponse,
  config: CollabRouteConfig
): Promise<boolean> {
  const url = new URL(req.url || '', 'http://localhost');
  if (!url.pathname.startsWith('/api/collab')) return false;

  const action = url.searchParams.get('action') || 'status';

  if (action === 'status') {
    if (!config.redisUrl) {
      json(res, 200, {
        configured: false,
        reason:
          'No shared session is configured. The model, roles and history are real and local; nothing is being sent or received.',
      });
      return true;
    }
    try {
      const c = await client(config.redisUrl);
      await c.get('soulsonus:collab:ping');
      json(res, 200, { configured: true, transport: 'redis' });
    } catch (err) {
      // Configured and unreachable is a different state from unconfigured,
      // and the screen has to be able to say which.
      json(res, 200, {
        configured: false,
        reason: `A shared session is configured but could not be reached: ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
    }
    return true;
  }

  const projectId = safeProjectId(url.searchParams.get('projectId'));
  if (!projectId) {
    json(res, 400, { error: 'A projectId is required, and may only contain letters, digits, _ . : and -' });
    return true;
  }
  if (!config.redisUrl) {
    json(res, 503, { error: 'No shared session is configured on this server.' });
    return true;
  }

  if (action === 'publish' && req.method === 'POST') {
    try {
      const raw = await readBody(req);
      const parsed = JSON.parse(raw) as { state?: unknown; operations?: unknown };
      if (!parsed || typeof parsed.state !== 'object' || parsed.state === null) {
        json(res, 400, { error: 'A publish carries the publisher’s own state.' });
        return true;
      }
      const c = await client(config.redisUrl);
      const payload = JSON.stringify({ state: parsed.state, at: Date.now() });
      // The snapshot is what a late joiner reads; the channel is what an
      // already-connected peer hears. Both, or a joiner sees an empty room.
      await c.set(KEY(projectId), payload, { EX: config.snapshotTtlSeconds });
      await c.publish(CHANNEL(projectId), payload);
      json(res, 200, { ok: true });
    } catch (err) {
      json(res, 500, { error: err instanceof Error ? err.message : String(err) });
    }
    return true;
  }

  if (action === 'subscribe') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let sub: RedisLike | null = null;
    let alive = true;
    const send = (data: string) => {
      if (alive) res.write(`data: ${data}\n\n`);
    };

    try {
      const c = await client(config.redisUrl);
      // A late joiner gets the room as it stands before hearing any change.
      const snapshot = await c.get(KEY(projectId));
      if (snapshot) send(snapshot);

      // A subscribing connection cannot serve commands, so it is its own.
      sub = c.duplicate();
      sub.on('error', () => {});
      await sub.connect();
      await sub.subscribe(CHANNEL(projectId), (message) => send(message));
    } catch (err) {
      send(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
    }

    // Proxies close a stream that says nothing. This keeps it open without
    // pretending a peer spoke.
    const beat = setInterval(() => alive && res.write(': keepalive\n\n'), 25000);
    const stop = () => {
      alive = false;
      clearInterval(beat);
      void sub?.quit().catch(() => {});
      res.end();
    };
    req.on('close', stop);
    req.on('error', stop);
    return true;
  }

  json(res, 400, { error: `Unknown action "${action}".` });
  return true;
}
