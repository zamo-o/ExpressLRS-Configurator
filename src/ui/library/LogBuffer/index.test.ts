import LogBuffer, {
  EMPTY_LOG,
  logSnapshotToString,
  MAX_TAIL_LENGTH,
} from './index';

describe('LogBuffer', () => {
  it('joins every appended batch into the full log text', () => {
    const buffer = new LogBuffer();
    buffer.append(['Compiling a.o\n', 'Compiling b.o\n']);
    const snapshot = buffer.append(['Linking firmware.elf\n']);

    expect(snapshot.count).toBe(2); // one chunk per batch
    expect(snapshot.tail).toBe('');
    expect(logSnapshotToString(snapshot)).toBe(
      'Compiling a.o\nCompiling b.o\nLinking firmware.elf\n',
    );
  });

  it('keeps an unfinished line in the tail until its newline arrives', () => {
    const buffer = new LogBuffer();
    const connecting = buffer.append(['Connecting...']);
    expect(connecting.count).toBe(0);
    expect(connecting.tail).toBe('Connecting...');

    const connected = buffer.append(['.. done\n', 'Writing at 0x0 (5 %)\r']);
    expect(connected.chunks.slice(0, connected.count)).toEqual([
      'Connecting..... done\n',
    ]);
    expect(connected.tail).toBe('Writing at 0x0 (5 %)\r');
    expect(logSnapshotToString(connected)).toBe(
      'Connecting..... done\nWriting at 0x0 (5 %)\r',
    );
  });

  it('moves an over-long unfinished line into a chunk', () => {
    const buffer = new LogBuffer();
    const snapshot = buffer.append(['x'.repeat(MAX_TAIL_LENGTH + 1)]);
    expect(snapshot.count).toBe(1);
    expect(snapshot.tail).toBe('');
  });

  it('keeps earlier snapshots unchanged when more batches arrive', () => {
    const buffer = new LogBuffer();
    const first = buffer.append(['one\n']);
    const second = buffer.append(['two\n']);

    expect(logSnapshotToString(first)).toBe('one\n');
    expect(logSnapshotToString(second)).toBe('one\ntwo\n');
    // snapshots share one append-only list instead of copying it
    expect(second.chunks).toBe(first.chunks);
  });

  it('ignores empty batches', () => {
    const buffer = new LogBuffer();
    buffer.append(['a\n']);
    expect(buffer.append([]).count).toBe(1);
    expect(buffer.append(['']).count).toBe(1);
  });

  it('starts a new log after reset without touching old snapshots', () => {
    const buffer = new LogBuffer();
    const before = buffer.append(['old log\n', 'unfinished']);
    buffer.reset();
    const after = buffer.append(['new log\n']);

    expect(after.chunks).not.toBe(before.chunks);
    expect(logSnapshotToString(after)).toBe('new log\n');
    expect(logSnapshotToString(before)).toBe('old log\nunfinished');
    expect(logSnapshotToString(EMPTY_LOG)).toBe('');
  });

  it('produces the same text as the previous array spread + join implementation', () => {
    const batches = Array.from({ length: 60 }, (_, b) => {
      const lines = Array.from(
        { length: 7 },
        (__, i) => `batch ${b} line ${i}\r\n`,
      );
      // every third batch ends in the middle of a line (esptool progress)
      return b % 3 === 0 ? [...lines, `Writing at 0x${b} (${b} %)\r`] : lines;
    });
    let legacy: string[] = [];
    const buffer = new LogBuffer();
    batches.forEach((batch) => {
      legacy = [...legacy, ...batch];
      const snapshot = buffer.append(batch);
      expect(logSnapshotToString(snapshot)).toBe(legacy.join(''));
    });
  });
});
