import getCompileTarget from './compileTarget';

describe('getCompileTarget', () => {
  it('uses the UART env by default', () => {
    expect(
      getCompileTarget(
        {
          firmware: 'Unified_ESP32_2400_TX',
          upload_methods: ['uart', 'wifi', 'etx'],
        },
        false,
      ),
    ).toEqual('Unified_ESP32_2400_TX_via_UART');
  });

  it('uses the STLINK env when the device supports stlink', () => {
    expect(
      getCompileTarget(
        {
          firmware: 'Frsky_TX_R9M',
          upload_methods: ['stlink', 'stock', 'wifi'],
        },
        false,
      ),
    ).toEqual('Frsky_TX_R9M_via_STLINK');
  });

  it('builds the TX env for receivers used as transmitters', () => {
    expect(
      getCompileTarget(
        {
          firmware: 'Unified_ESP8285_2400_RX',
          upload_methods: ['uart', 'betaflight', 'wifi'],
        },
        true,
      ),
    ).toEqual('Unified_ESP8285_2400_TX_via_UART');
  });
});
