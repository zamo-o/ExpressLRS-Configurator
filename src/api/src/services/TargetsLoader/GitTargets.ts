import { Service } from 'typedi';
import path from 'path';
import FirmwareSource from '../../models/enum/FirmwareSource';
import TargetArgs from '../../graphql/args/Target';
import { LoggerService } from '../../logger';
import Device from '../../models/Device';
import DeviceService from '../Device';
import TargetsLoader, { GitRepository } from './index';
import loadTargetsFromDirectory from './loadTargetsFromDirectory';
import {
  findGitExecutable,
  GitFirmwareDownloader,
} from '../../library/FirmwareDownloader';
import Mutex from '../../library/Mutex';
import { removeDirectoryContents } from '../FlashingStrategyLocator/artefacts';

@Service()
export default class GitTargetsService extends TargetsLoader {
  mutex: Mutex;

  /*
    PlatformIO envs for immutable refs (tags, commits, pull request head commits),
    keyed by repository url, firmware source and ref.
   */
  private envsCache: Map<string, string[]>;

  constructor(
    private logger: LoggerService,
    private deviceService: DeviceService,
    private PATH: string,
    private targetStoragePath: string,
  ) {
    super();
    this.mutex = new Mutex();
    this.envsCache = new Map();
  }

  private envsCacheKey(
    args: TargetArgs,
    gitRepository: Pick<GitRepository, 'url'>,
  ): string | null {
    switch (args.source) {
      case FirmwareSource.GitTag:
        return `${gitRepository.url}#${args.source}#${args.gitTag}`;
      case FirmwareSource.GitCommit:
        return `${gitRepository.url}#${args.source}#${args.gitCommit}`;
      case FirmwareSource.GitPullRequest:
        if (args.gitPullRequest === null) {
          return null;
        }
        return `${gitRepository.url}#${args.source}#${args.gitPullRequest.headCommitHash}`;
      default:
        return null;
    }
  }

  async loadTargetsList(
    args: TargetArgs,
    gitRepository: GitRepository,
  ): Promise<Device[]> {
    const availableTargets = await this.loadAvailableEnvs(args, gitRepository);
    const devices = this.deviceService.getDevices();
    return devices
      .map((value) => {
        const device = { ...value };
        device.targets = value.targets.filter((item) =>
          availableTargets.find((target) => target === item.name),
        );
        return device;
      })
      .filter((item) => item.targets.length > 0);
  }

  /*
    Returns PlatformIO env names ([env:...] sections in targets/*.ini) that exist
    in the firmware source for the selected version.
   */
  async loadAvailableEnvs(
    args: TargetArgs,
    gitRepository: Pick<GitRepository, 'url' | 'srcFolder'>,
  ): Promise<string[]> {
    const cacheKey = this.envsCacheKey(args, gitRepository);
    if (cacheKey !== null) {
      const cached = this.envsCache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    await this.mutex.tryLockWithTimeout(60000);

    try {
      let gitPath = '';
      try {
        gitPath = await findGitExecutable(this.PATH);
      } catch (e) {
        this.logger?.error('failed to find git', undefined, {
          PATH: this.PATH,
          err: e,
        });
        throw e;
      }
      this.logger?.log('git path', {
        gitPath,
      });

      const firmwareDownload = new GitFirmwareDownloader(
        {
          baseDirectory: this.targetStoragePath,
          gitBinaryLocation: gitPath,
        },
        this.logger,
      );

      let availableTargets: string[] = [];
      const srcFolder
        = gitRepository.srcFolder === '/' ? '' : `${gitRepository.srcFolder}/`;
      switch (args.source) {
        case FirmwareSource.GitBranch:
          const branchResult = await firmwareDownload.checkoutBranch(
            gitRepository.url,
            `${srcFolder}targets`,
            args.gitBranch,
          );
          availableTargets = await loadTargetsFromDirectory(branchResult.path);
          break;
        case FirmwareSource.GitCommit:
          const commitResult = await firmwareDownload.checkoutCommit(
            gitRepository.url,
            `${srcFolder}targets`,
            args.gitCommit,
          );
          availableTargets = await loadTargetsFromDirectory(commitResult.path);
          break;
        case FirmwareSource.GitTag:
          const tagResult = await firmwareDownload.checkoutTag(
            gitRepository.url,
            `${srcFolder}targets`,
            args.gitTag,
          );
          availableTargets = await loadTargetsFromDirectory(tagResult.path);
          break;
        case FirmwareSource.GitPullRequest:
          if (args.gitPullRequest === null) {
            throw new Error('empty GitPullRequest head commit hash');
          }
          const prResult = await firmwareDownload.checkoutCommit(
            gitRepository.url,
            `${srcFolder}targets`,
            args.gitPullRequest.headCommitHash,
          );
          availableTargets = await loadTargetsFromDirectory(prResult.path);
          break;
        case FirmwareSource.Local:
          availableTargets = await loadTargetsFromDirectory(
            path.join(args.localPath, 'targets'),
          );
          break;
        default:
          throw new Error(
            `unsupported firmware source for the targets service: ${args.source}`,
          );
      }
      if (cacheKey !== null) {
        this.envsCache.set(cacheKey, availableTargets);
      }
      return availableTargets;
    } finally {
      this.mutex.unlock();
    }
  }

  async clearCache() {
    await this.mutex.tryLockWithTimeout(60000);
    try {
      this.envsCache.clear();
      return await removeDirectoryContents(this.targetStoragePath);
    } finally {
      this.mutex.unlock();
    }
  }
}
