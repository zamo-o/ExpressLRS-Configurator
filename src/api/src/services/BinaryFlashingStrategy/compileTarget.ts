import { DeviceDescription } from './TargetsJSONLoader';

/*
  Returns the PlatformIO env name used to compile firmware for the device,
  for example Unified_ESP32_2400_TX_via_UART or Frsky_TX_R9M_via_STLINK.
 */
const getCompileTarget = (
  config: Pick<DeviceDescription, 'firmware' | 'upload_methods'>,
  rxAsTx: boolean,
): string => {
  const firmwareName = rxAsTx
    ? config.firmware.replace('_RX', '_TX')
    : config.firmware;

  let target = `${firmwareName}_via_UART`;

  if (config.upload_methods.includes('stlink')) {
    target = `${config.firmware}_via_STLINK`;
  }
  return target;
};

export default getCompileTarget;
