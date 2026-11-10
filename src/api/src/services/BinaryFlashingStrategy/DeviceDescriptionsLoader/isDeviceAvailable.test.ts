import FirmwareSource from '../../../models/enum/FirmwareSource';
import isDeviceAvailable from './isDeviceAvailable';

const r9m = {
  firmware: 'Frsky_TX_R9M',
  upload_methods: ['stlink', 'stock', 'wifi'],
};

const unifiedTx = {
  firmware: 'Unified_ESP32_2400_TX',
  upload_methods: ['uart', 'wifi', 'etx'],
};

const envs364 = [
  'Frsky_TX_R9M_via_STLINK',
  'Frsky_TX_R9M_via_stock_BL',
  'Unified_ESP32_2400_TX_via_UART',
];

const envs400 = ['Unified_ESP32_2400_TX_via_UART'];

const tag = (gitTag: string) => ({ source: FirmwareSource.GitTag, gitTag });

describe('isDeviceAvailable', () => {
  it('hides STM32 devices when their env is missing from the firmware source', () => {
    expect(isDeviceAvailable(r9m, tag('4.0.0'), envs400)).toBe(false);
  });

  it('shows STM32 devices when their env exists', () => {
    expect(isDeviceAvailable(r9m, tag('3.6.4'), envs364)).toBe(true);
  });

  it('shows unified devices in both versions', () => {
    expect(isDeviceAvailable(unifiedTx, tag('3.6.4'), envs364)).toBe(true);
    expect(isDeviceAvailable(unifiedTx, tag('4.0.0'), envs400)).toBe(true);
  });

  it('filters by env for non-tag sources too', () => {
    const branch = { source: FirmwareSource.GitBranch, gitTag: '' };
    expect(isDeviceAvailable(r9m, branch, envs400)).toBe(false);
  });

  it('shows every device when envs could not be loaded', () => {
    expect(isDeviceAvailable(r9m, tag('4.0.0'), null)).toBe(true);
    expect(isDeviceAvailable(r9m, tag('4.0.0'), [])).toBe(true);
  });

  it('keeps hiding devices newer than the selected tag', () => {
    const newDevice = { ...unifiedTx, min_version: '3.5.0' };
    expect(isDeviceAvailable(newDevice, tag('3.4.0'), null)).toBe(false);
    expect(isDeviceAvailable(newDevice, tag('3.5.0'), null)).toBe(true);
    expect(
      isDeviceAvailable(newDevice, { source: FirmwareSource.GitBranch, gitTag: '' }, null),
    ).toBe(true);
  });
});
