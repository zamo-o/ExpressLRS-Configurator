import path from 'path';
import loadTargetsFromDirectory from './loadTargetsFromDirectory';

function fixture(name: string): string {
  return path.join(__dirname, '__fixtures__', name);
}

describe('loadTargetsFromDirectory', () => {
  it('collects env names from every ini file', async () => {
    const envs = await loadTargetsFromDirectory(fixture('targets-3.6.4'));

    expect(envs.sort()).toEqual([
      'Frsky_RX_R9MM_R9MINI_via_STLINK',
      'Frsky_TX_R9M_via_STLINK',
      'Frsky_TX_R9M_via_stock_BL',
      'Unified_ESP32_2400_TX_via_UART',
      'Unified_ESP32_2400_TX_via_WIFI',
      'Unified_ESP8285_2400_RX_via_BetaflightPassthrough',
      'Unified_ESP8285_2400_RX_via_UART',
    ]);
  });

  it('does not return STM32 envs dropped in 4.0.0', async () => {
    const envs = await loadTargetsFromDirectory(fixture('targets-4.0.0'));

    expect(envs).toContain('Unified_ESP32_2400_TX_via_UART');
    expect(envs).not.toContain('Frsky_TX_R9M_via_STLINK');
  });

  it('throws when the directory does not exist', async () => {
    await expect(
      loadTargetsFromDirectory(fixture('does-not-exist')),
    ).rejects.toThrow('does not exist');
  });
});
