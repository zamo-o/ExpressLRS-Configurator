import { Rtttl } from 'bluejay-rtttl-parse';
import { MelodyParser } from './index';

// bluejay-rtttl-parse ships ESM only, replace it with a module mock.
jest.mock('bluejay-rtttl-parse', () => ({ Rtttl: { parse: jest.fn() } }));

describe('MelodyParser.parseToArray', () => {
  it('parses the "notes|bpm|transpose" format into [frequency, ms] pairs', () => {
    // At 120 bpm a quarter note lasts 500 ms, pauses have frequency 0.
    expect(MelodyParser.parseToArray('A4 4 P4 A5 8|120')).toEqual([
      [440, 500],
      [0, 500],
      [880, 250],
    ]);
    // Transposing by 12 semitones moves A4 up one octave.
    expect(MelodyParser.parseToArray('A4 4|120|12')).toEqual([[880, 500]]);
  });

  it('floors RTTTL values and keeps at most 32 notes', () => {
    // Stub: the RTTTL parser returns a fixed 40-note melody.
    const melody = Array.from({ length: 40 }, () => ({
      frequency: 440.7,
      duration: 250.9,
    }));
    const parse = jest.mocked(Rtttl.parse).mockReturnValue({ melody });

    const result = MelodyParser.parseToArray('tune:d=4,o=5,b=120:a');

    expect(parse).toHaveBeenCalledWith('tune:d=4,o=5,b=120:a');
    expect(result).toHaveLength(32);
    expect(result[0]).toEqual([440, 250]);
  });
});
