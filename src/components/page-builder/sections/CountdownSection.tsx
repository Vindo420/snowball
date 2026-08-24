'use client';

import { useEffect, useState } from 'react';

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Time's up!";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

/**
 * Renders nothing (no error) when `endsAt` is unset.
 *
 * Hydration safety: the server renders using `serverNowMs` (computed once,
 * server-side, at request time) rather than calling `Date.now()` itself. The
 * client's first render — before mount, during hydration — uses that exact
 * same frozen value via `useState(serverNowMs)`, so its output is
 * byte-identical to the server's. Only after mount does the `useEffect` below
 * (which never runs during SSR or the initial hydration pass) start a
 * `setInterval` that recomputes from real `Date.now()` calls and ticks the
 * display. See design.md for why this is preferred over
 * `suppressHydrationWarning`.
 */
export function CountdownSection({ endsAt, serverNowMs }: { endsAt: Date | null; serverNowMs: number }) {
  const [nowMs, setNowMs] = useState(serverNowMs);

  useEffect(() => {
    if (!endsAt) return;
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (!endsAt) {
    return null;
  }

  const remainingMs = endsAt.getTime() - nowMs;

  return (
    <section className="text-center">
      <h2 className="mb-2 text-lg font-semibold">Ends in</h2>
      <p className="text-2xl font-bold tabular-nums">{formatRemaining(remainingMs)}</p>
    </section>
  );
}
