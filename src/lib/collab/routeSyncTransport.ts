/**
 * `SyncTransport` over the app's own relay.
 *
 * The seam in `collaborativeState.ts` has had one implementation --
 * `unconfiguredTransport`, which reports itself unconfigured rather than
 * pretending. This is the second: it speaks to `/api/collab`, which holds
 * Redis on the server side.
 *
 * What it deliberately does not do:
 *
 *   It does not merge. `publish` sends the publisher's own state and its
 *   operations; `subscribe` hands a peer's state straight to the store, which
 *   folds it in with `mergeStates`. The rules live in one file and the
 *   transport is a pipe.
 *
 *   It does not invent a status. When the relay says unconfigured, so does
 *   this -- clause XV.4, because the collaboration screen once showed people
 *   who were not there, and a transport that reported itself hopeful would be
 *   that same defect one layer down.
 */
import type { CollaborativeState, Operation, SyncStatus, SyncTransport } from '../collaborativeState';

export interface RouteTransportOptions {
  /**
   * The publisher's current state, read at publish time.
   *
   * The store owns its state and hands the transport only operations, so
   * without this a peer would receive changes with nothing to merge them
   * into. Read lazily because the store and the transport are constructed
   * together and neither exists first.
   */
  getLocalState: () => CollaborativeState | null;
  /** Overridable so a check can point at a relay it started itself. */
  baseUrl?: string;
}

export function createRouteSyncTransport(opts: RouteTransportOptions): SyncTransport {
  const base = (opts.baseUrl || '').replace(/\/+$/, '');
  const api = (q: string) => `${base}/api/collab?${q}`;

  return {
    name: 'route',

    async status(): Promise<SyncStatus> {
      try {
        const res = await fetch(api('action=status'));
        if (!res.ok) {
          return { configured: false, reason: `The shared-session relay answered ${res.status}.` };
        }
        const body = (await res.json()) as { configured?: boolean; reason?: string };
        return body.configured
          ? // The endpoint named here is the app's own path, never Redis's
            // address: `e05Contract` states the rule -- a status "never
            // contains an endpoint or a key" the browser should not hold --
            // and the relay keeps the URL and any credential on its side.
            { configured: true, connected: true, endpoint: `${base}/api/collab` }
          : {
              configured: false,
              reason:
                body.reason ||
                'The shared-session relay reports no configuration, and gave no reason.',
            };
      } catch (err) {
        return {
          configured: false,
          reason: `The shared-session relay could not be reached: ${
            err instanceof Error ? err.message : String(err)
          }`,
        };
      }
    },

    async publish(projectId: string, operations: Operation[]): Promise<void> {
      const state = opts.getLocalState();
      if (!state) return;
      const res = await fetch(api(`action=publish&projectId=${encodeURIComponent(projectId)}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, operations }),
      });
      if (!res.ok) {
        // Thrown rather than swallowed: the store's own catch decides what a
        // failed publish means, and it already knows not to lose the log.
        throw new Error(`The shared-session relay refused the publish: ${res.status}`);
      }
    },

    subscribe(projectId: string, onRemote: (state: CollaborativeState) => void): () => void {
      if (typeof EventSource === 'undefined') return () => {};
      const source = new EventSource(api(`action=subscribe&projectId=${encodeURIComponent(projectId)}`));
      source.onmessage = (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(String(event.data)) as { state?: CollaborativeState };
          // A relay reporting its own trouble is not a peer state. Handing it
          // to the store would merge an error object into the session.
          if (parsed && parsed.state && Array.isArray(parsed.state.participants)) {
            onRemote(parsed.state);
          }
        } catch {
          // A frame that will not parse is dropped. The next one is whole.
        }
      };
      // EventSource reconnects on its own; nothing here should treat a
      // reconnect as a state change.
      source.onerror = () => {};
      return () => source.close();
    },
  };
}
