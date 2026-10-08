/** Re-read when a confirmed local write occurred while the snapshot was loading. */
export async function loadSnapshot<T>(read: () => Promise<T>, revision: () => number, signal: AbortSignal, publish: (result: T) => void): Promise<void> {
  while (!signal.aborted) {
    const startedAt = revision();
    const result = await read();
    if (!signal.aborted && startedAt === revision()) {
      publish(result);
      return;
    }
  }
}
