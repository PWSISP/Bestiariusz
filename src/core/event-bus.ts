// Typed synchronous event bus. Handlers run in subscription order; emit works on a snapshot of the
// handler list, so subscriptions added or removed during an emit do not affect that emit.

export type Unsubscribe = () => void;

export interface EventBus<E extends object> {
  on<K extends keyof E>(type: K, handler: (payload: E[K]) => void): Unsubscribe;
  emit<K extends keyof E>(type: K, payload: E[K]): void;
  /** Handlers for one type, or for all types when called without an argument. */
  listenerCount(type?: keyof E): number;
}

// Each subscription is its own entry, so the same function can be subscribed twice.
interface Entry {
  handler: (payload: never) => void;
}

export function createEventBus<E extends object>(): EventBus<E> {
  const handlers = new Map<keyof E, Set<Entry>>();

  return {
    on(type, handler) {
      let set = handlers.get(type);
      if (!set) {
        set = new Set();
        handlers.set(type, set);
      }
      const entry: Entry = { handler };
      set.add(entry);
      return () => {
        set.delete(entry);
      };
    },

    emit(type, payload) {
      const set = handlers.get(type);
      if (!set) return;
      let failed = false;
      let firstError: unknown;
      for (const entry of [...set]) {
        try {
          (entry.handler as (payload: E[typeof type]) => void)(payload);
        } catch (error) {
          if (!failed) {
            failed = true;
            firstError = error;
          }
        }
      }
      if (failed) throw firstError;
    },

    listenerCount(type) {
      if (type !== undefined) return handlers.get(type)?.size ?? 0;
      let total = 0;
      for (const set of handlers.values()) total += set.size;
      return total;
    },
  };
}

/** A view of `bus` whose dispose() removes only the subscriptions made through it. */
export function createScopedBus<E extends object>(
  bus: EventBus<E>,
): EventBus<E> & { dispose(): void } {
  const own = new Set<Unsubscribe>();

  return {
    on(type, handler) {
      const off = bus.on(type, handler);
      const unsubscribe: Unsubscribe = () => {
        off();
        own.delete(unsubscribe);
      };
      own.add(unsubscribe);
      return unsubscribe;
    },
    emit: (type, payload) => bus.emit(type, payload),
    listenerCount: (type) => bus.listenerCount(type),
    dispose() {
      for (const unsubscribe of [...own]) unsubscribe();
    },
  };
}
