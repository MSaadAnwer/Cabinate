/** Ordered persistence, with optimistic edits and confirmed destructive changes. */
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
  let confirmedPending = 0;
  function commit(
    change: (value: T) => T,
    beforePublish?: () => void,
  ): Promise<void> {
    confirmedPending++;
    const task = queue
      .then(async () => {
        // Evaluate after earlier writes settle, including any rollback they need.
        const next = change(current);
        await write(next);
        current = persisted = next;
        // Animation setup must not turn a successful save into an apparent failure.
        try {
          beforePublish?.();
        } catch {
          /* Publication still completes. */
        }
        publish(next);
        report("");
      })
      .catch((error: unknown) => {
        report(
          "Could not save your change. Your saved content is still here. Please try again.",
        );
        throw error;
      })
      .finally(() => {
        confirmedPending--;
      });
    queue = task.catch(() => {});
    return task;
  }
  return {
    hydrate(value: T) {
      current = persisted = value;
      publish(value);
    },
    update(change: (value: T) => T): Promise<void> {
      // Edits arriving behind a confirmed removal must use its settled state.
      // Queue them in invocation order instead of writing an older snapshot over it.
      if (confirmedPending) return commit(change);
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
    commit,
  };
}
