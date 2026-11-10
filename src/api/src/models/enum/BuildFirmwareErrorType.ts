import { registerEnumType } from 'type-graphql';

enum BuildFirmwareErrorType {
  PythonDependencyError = 'PythonDependencyError',
  PlatformioDependencyError = 'PlatformioDependencyError',
  GitDependencyError = 'GitDependencyError',
  BuildError = 'BuildError',
  FlashError = 'FlashError',
  GenericError = 'GenericError',
  TargetMismatch = 'TargetMismatch',
  UnsupportedTarget = 'UnsupportedTarget',
}

registerEnumType(BuildFirmwareErrorType, {
  name: 'BuildFirmwareErrorType',
});

export default BuildFirmwareErrorType;
