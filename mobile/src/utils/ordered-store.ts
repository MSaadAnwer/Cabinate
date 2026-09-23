/** Optimistic snapshots are published immediately and persisted in invocation order. */
export function createOrderedStore<T>(
  initial: T,
  write: (value: T) => Promise<void>,
  publish: (value: T) => void,
  report: (message: string) => void,
) {
  let current = initial;
  let persisted = initial;
  let revision = 0;
  let queue = Promise.resolve();
  return {
    hydrate(value: T) {
      current = persisted = value;
      publish(value);
    },
    update(change: (value: T) => T): Promise<void> {
      const next = change(current);
      const id = ++revision;
      current = next;
      publish(next);
      const task = queue
        .then(async () => {
          await write(next);
          persisted = next;
          report("");
        })
        .catch((error: unknown) => {
          if (id === revision) {
            current = persisted;
            publish(persisted);
            report(
              "Could not save your last change. Your last saved version is restored. Please try again.",
            );
          }
          throw error;
        });
      queue = task.catch(() => {});
      return task;
    },
  };
}
