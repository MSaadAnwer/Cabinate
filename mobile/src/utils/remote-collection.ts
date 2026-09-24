export interface CollectionState<T> {
  items: T[];
  loading: boolean;
  loaded: boolean;
  error: string;
}

export function initialCollection<T>(): CollectionState<T> {
  return { items: [], loading: true, loaded: false, error: "" };
}

/** Only the latest refresh may publish; confirmed mutations survive older reads. */
export function createRemoteCollection<T extends { id: string }>(
  read: () => Promise<T[]>,
  publish: (state: CollectionState<T>) => void,
) {
  let state = initialCollection<T>();
  let request = 0;
  let revision = 0;
  const changes = new Map<string, { revision: number; item: T | null }>();
  const emit = (next: CollectionState<T>) => {
    state = next;
    publish(state);
  };
  return {
    upsert(item: T) {
      changes.set(item.id, { revision: ++revision, item });
      const exists = state.items.some((value) => value.id === item.id);
      emit({
        ...state,
        items: exists
          ? state.items.map((value) => (value.id === item.id ? item : value))
          : [item, ...state.items],
      });
    },
    remove(id: string) {
      changes.set(id, { revision: ++revision, item: null });
      emit({ ...state, items: state.items.filter((item) => item.id !== id) });
    },
    async reload() {
      const ticket = ++request;
      const startedAt = revision;
      emit({ ...state, loading: true });
      try {
        const response = await read();
        if (ticket !== request) return;
        if (!Array.isArray(response))
          throw new Error("Invalid collection response");
        const items = new Map(response.map((item) => [item.id, item]));
        const added: T[] = [];
        for (const [id, change] of changes) {
          if (change.revision <= startedAt) {
            // This read began after the server confirmed the mutation.
            changes.delete(id);
          } else if (!change.item) {
            items.delete(id);
          } else if (items.has(id)) {
            items.set(id, change.item);
          } else {
            added.unshift(change.item);
          }
        }
        emit({
          items: [...added, ...items.values()],
          loaded: true,
          loading: false,
          error: "",
        });
      } catch {
        if (ticket === request)
          emit({
            ...state,
            loading: false,
            error: "Could not refresh. Please try again.",
          });
      }
    },
  };
}
