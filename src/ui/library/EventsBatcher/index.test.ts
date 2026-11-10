import EventsBatcher from './index';

// Fake timers replace setTimeout and Date.now, so batching windows can be
// stepped through without real waiting.
describe('EventsBatcher', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('collects events arriving within the window into one batch', () => {
    const batcher = new EventsBatcher<string>(1000);
    // Mock subscriber: records every batch it receives.
    const subscriber = jest.fn();
    batcher.onBatch(subscriber);

    batcher.enqueue('a');
    jest.advanceTimersByTime(200);
    batcher.enqueue('b');

    expect(subscriber).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1050);

    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith(['a', 'b']);
  });

  it('broadcasts immediately to every subscriber once the window has passed', () => {
    const batcher = new EventsBatcher<number>(1000);
    const first = jest.fn();
    const second = jest.fn();
    batcher.onBatch(first);
    batcher.onBatch(second);

    jest.setSystemTime(Date.now() + 1500);
    batcher.enqueue(42);

    expect(first).toHaveBeenCalledWith([42]);
    expect(second).toHaveBeenCalledWith([42]);
    expect(batcher.buffer).toEqual([]);
  });
});
