/*
  Accumulates build / serial monitor log output that arrives in batches
  (see EventsBatcher).

  The log is kept as a list of chunks of complete lines (one chunk per batch)
  plus the current unfinished line (`tail`) instead of one big string.
  Appending a batch costs O(batch size) no matter how long the log already is,
  and <Logs /> only has to add the new chunk to the DOM. The full text is
  joined only on demand (copy to clipboard / save to file).
 */
export interface LogSnapshot {
  /*
    Append-only list shared between snapshots of the same log; only the
    first `count` chunks belong to this snapshot. Every chunk ends with '\n'
    (except when a single line grows over MAX_TAIL_LENGTH).
   */
  readonly chunks: readonly string[];
  readonly count: number;
  /* text after the last '\n' (a line that is still being written) */
  readonly tail: string;
}

/*
  A line without '\n' (e.g. esptool progress written with '\r') is kept in the
  tail; when it gets this long it is moved into a chunk anyway so that the
  tail cannot grow without limit.
 */
export const MAX_TAIL_LENGTH = 8192;

export const EMPTY_LOG: LogSnapshot = { chunks: [], count: 0, tail: '' };

export function logSnapshotToString(snapshot: LogSnapshot): string {
  return snapshot.chunks.slice(0, snapshot.count).join('') + snapshot.tail;
}

export default class LogBuffer {
  private chunks: string[] = [];

  private tail = '';

  append(newLogs: string[]): LogSnapshot {
    const text = this.tail + newLogs.join('');
    let cut = text.lastIndexOf('\n') + 1;
    if (text.length - cut > MAX_TAIL_LENGTH) {
      cut = text.length;
    }
    if (cut > 0) {
      this.chunks.push(text.slice(0, cut));
    }
    this.tail = text.slice(cut);
    return { chunks: this.chunks, count: this.chunks.length, tail: this.tail };
  }

  reset(): void {
    // a new array, so snapshots handed out before the reset stay valid
    this.chunks = [];
    this.tail = '';
  }
}
