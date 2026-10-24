import { describe, expect, it } from 'vitest';
import { createEventBus, createScopedBus } from '../../src/core/event-bus.ts';

interface Events {
  ping: number;
  pong: string;
}

describe('event bus', () => {
  it('calls handlers in subscription order', () => {
    const bus = createEventBus<Events>();
    const calls: number[] = [];
    bus.on('ping', () => calls.push(1));
    bus.on('ping', () => calls.push(2));
    bus.emit('ping', 0);
    expect(calls).toEqual([1, 2]);
  });

  it('unsubscribe is idempotent and stops delivery', () => {
    const bus = createEventBus<Events>();
    const got: number[] = [];
    bus.on('ping', () => got.push(0));
    const off = bus.on('ping', (n) => got.push(n));
    expect(bus.listenerCount('ping')).toBe(2);
    off();
    off();
    expect(bus.listenerCount('ping')).toBe(1);
    bus.emit('ping', 7);
    expect(got).toEqual([0]);
  });

  it('emit iterates over a snapshot', () => {
    const bus = createEventBus<Events>();
    const late: number[] = [];
    let offSecond = () => {};
    bus.on('ping', () => {
      bus.on('ping', (n) => late.push(n));
      offSecond();
    });
    const second: number[] = [];
    offSecond = bus.on('ping', (n) => second.push(n));
    bus.emit('ping', 1);
    expect(late).toEqual([]);
    expect(second).toEqual([1]);
    bus.emit('ping', 2);
    expect(late).toEqual([2]);
    expect(second).toEqual([1]);
  });

  it('a throwing handler does not stop the others', () => {
    const bus = createEventBus<Events>();
    const first = new Error('first');
    const calls: string[] = [];
    bus.on('ping', () => {
      throw first;
    });
    bus.on('ping', () => {
      calls.push('second');
      throw new Error('second');
    });
    bus.on('ping', () => calls.push('third'));
    expect(() => bus.emit('ping', 0)).toThrow(first);
    expect(calls).toEqual(['second', 'third']);
  });

  it('listenerCount counts per type and in total', () => {
    const bus = createEventBus<Events>();
    bus.on('ping', () => {});
    bus.on('ping', () => {});
    bus.on('pong', () => {});
    expect(bus.listenerCount('ping')).toBe(2);
    expect(bus.listenerCount('pong')).toBe(1);
    expect(bus.listenerCount()).toBe(3);
  });

  it('scoped bus dispose removes only its own subscriptions', () => {
    const base = createEventBus<Events>();
    const baseGot: string[] = [];
    const scopedGot: string[] = [];
    base.on('pong', (s) => baseGot.push(s));
    const scoped = createScopedBus(base);
    scoped.on('pong', (s) => scopedGot.push(s));
    scoped.on('ping', () => {});
    expect(base.listenerCount()).toBe(3);
    scoped.emit('pong', 'a');
    expect(baseGot).toEqual(['a']);
    expect(scopedGot).toEqual(['a']);
    scoped.dispose();
    expect(base.listenerCount()).toBe(1);
    expect(scoped.listenerCount()).toBe(1);
    base.emit('pong', 'b');
    expect(baseGot).toEqual(['a', 'b']);
    expect(scopedGot).toEqual(['a']);
  });
});
