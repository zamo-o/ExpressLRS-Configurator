import Mutex from './index';

describe('Mutex', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('refuses a second lock until unlocked', () => {
    const mutex = new Mutex();

    mutex.tryLock();
    expect(mutex.isLocked()).toBe(true);
    expect(() => mutex.tryLock()).toThrow('mutex already locked');

    mutex.unlock();
    expect(mutex.isLocked()).toBe(false);
    expect(() => mutex.tryLock()).not.toThrow();
  });

  // Fake timers drive the 100 ms polling loop and the timeout clock.
  it('waits for the lock to be released before acquiring it', async () => {
    jest.useFakeTimers();
    const mutex = new Mutex();
    mutex.tryLock();

    let acquired = false;
    const waiting = mutex.tryLockWithTimeout(1000).then(() => {
      acquired = true;
    });

    await jest.advanceTimersByTimeAsync(300);
    expect(acquired).toBe(false);

    mutex.unlock();
    await jest.advanceTimersByTimeAsync(100);
    await waiting;

    expect(acquired).toBe(true);
    expect(mutex.isLocked()).toBe(true);
  });

  it('gives up after the timeout when the lock is never released', async () => {
    jest.useFakeTimers();
    const mutex = new Mutex();
    mutex.tryLock();

    const waiting = expect(mutex.tryLockWithTimeout(500)).rejects.toThrow(
      'Mutex timed out waiting for lock',
    );
    await jest.advanceTimersByTimeAsync(600);
    await waiting;
  });
});
