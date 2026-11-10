import 'reflect-metadata';
import UserDefinesBuilder from './index';
import UserDefinesLoader from '../UserDefinesLoader';
import DeviceService from '../Device';
import Device from '../../models/Device';
import UserDefine from '../../models/UserDefine';
import FirmwareSource from '../../models/enum/FirmwareSource';
import UserDefineKey from '../../library/FirmwareBuilder/Enum/UserDefineKey';

// Real implementations touch the file system and git, replace them so the
// module graph stays small. Instances are injected through the constructor.
jest.mock('../UserDefinesLoader', () => ({ __esModule: true, default: class {} }));
jest.mock('../Device', () => ({ __esModule: true, default: class {} }));

const define = (key: UserDefineKey) => ({ key }) as UserDefine;

// Fake: a working in-memory replacement for DeviceService.
class FakeDeviceService {
  constructor(private devices: Device[]) {}

  getDevices(): Device[] {
    return this.devices;
  }
}

const devices = [
  {
    targets: [{ name: 'HappyModel_ES24TX_2400_TX_via_UART' }],
    userDefines: [
      define(UserDefineKey.BINDING_PHRASE),
      define(UserDefineKey.REGULATORY_DOMAIN_ISM_2400),
      define(UserDefineKey.UART_INVERTED),
      define(UserDefineKey.UNLOCK_HIGHER_POWER),
    ],
  },
] as unknown as Device[];

const gitRepository = {
  url: 'https://github.com/ExpressLRS/ExpressLRS',
  rawRepoUrl: 'https://raw.githubusercontent.com/ExpressLRS/ExpressLRS',
  srcFolder: 'src',
};

const input = {
  target: 'HappyModel_ES24TX_2400_TX_via_UART',
  source: FirmwareSource.GitTag,
  gitTag: '3.5.0',
  gitBranch: '',
  gitCommit: '',
  localPath: '',
  gitPullRequest: null,
};

describe('UserDefinesBuilder', () => {
  // Mock: records calls so the tests can verify how the builder uses it.
  let loader: { loadUserDefinesTxt: jest.Mock; clearFiles: jest.Mock };
  let builder: UserDefinesBuilder;

  beforeEach(() => {
    loader = { loadUserDefinesTxt: jest.fn(), clearFiles: jest.fn() };
    builder = new UserDefinesBuilder(
      loader as unknown as UserDefinesLoader,
      new FakeDeviceService(devices) as unknown as DeviceService,
    );
  });

  it('throws when no device has the requested target', async () => {
    await expect(
      builder.loadForDevice({ ...input, target: 'Unknown_TX' }, gitRepository),
    ).rejects.toThrow('device not found for target Unknown_TX');
    expect(loader.loadUserDefinesTxt).not.toHaveBeenCalled();
  });

  it('returns all device user defines for a local source without reading user_defines.txt', async () => {
    const result = await builder.loadForDevice(
      { ...input, source: FirmwareSource.Local },
      gitRepository,
    );

    expect(result).toEqual(devices[0].userDefines);
    expect(loader.loadUserDefinesTxt).not.toHaveBeenCalled();
  });

  it('keeps only the user defines the firmware version supports', async () => {
    loader.loadUserDefinesTxt.mockResolvedValue([
      UserDefineKey.BINDING_PHRASE,
      UserDefineKey.REGULATORY_DOMAIN_ISM_2400,
      UserDefineKey.UART_INVERTED,
    ]);

    const result = await builder.loadForDevice(input, gitRepository);

    expect(loader.loadUserDefinesTxt).toHaveBeenCalledTimes(1);
    expect(loader.loadUserDefinesTxt).toHaveBeenCalledWith(input, gitRepository);
    expect(result.map((d) => d.key)).toEqual([
      UserDefineKey.BINDING_PHRASE,
      UserDefineKey.REGULATORY_DOMAIN_ISM_2400,
      UserDefineKey.UART_INVERTED,
    ]);
  });

  it('throws when user_defines.txt yields fewer than 3 keys', async () => {
    loader.loadUserDefinesTxt.mockResolvedValue([UserDefineKey.BINDING_PHRASE]);

    await expect(builder.loadForDevice(input, gitRepository)).rejects.toThrow(
      'failed to parse compatible user define keys',
    );
  });

  it('delegates clearFiles to the loader', async () => {
    await builder.clearFiles();
    expect(loader.clearFiles).toHaveBeenCalledTimes(1);
  });
});
