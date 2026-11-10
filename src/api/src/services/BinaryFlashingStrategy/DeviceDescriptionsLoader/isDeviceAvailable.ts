import semver from 'semver';
import FirmwareSource from '../../../models/enum/FirmwareSource';
import { DeviceDescription } from '../TargetsJSONLoader';
import getCompileTarget from '../compileTarget';

/*
  Decides if a device from targets.json can be built with the selected firmware version.

  envs are the PlatformIO env names from the firmware source of that version. When they
  are unknown (null or empty) we only apply the min_version rule.
 */
const isDeviceAvailable = (
  config: Pick<DeviceDescription, 'firmware' | 'upload_methods' | 'min_version'>,
  args: { source: FirmwareSource; gitTag: string },
  envs: string[] | null,
): boolean => {
  const { min_version } = config;
  if (
    min_version
    && args.source === FirmwareSource.GitTag
    && semver.lt(args.gitTag, min_version)
  ) {
    return false;
  }
  if (envs === null || envs.length === 0) {
    return true;
  }
  return envs.includes(getCompileTarget(config, false));
};

export default isDeviceAvailable;
