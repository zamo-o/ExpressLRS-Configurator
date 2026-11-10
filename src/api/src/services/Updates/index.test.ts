import 'reflect-metadata';
import { Octokit } from '@octokit/rest';
import UpdatesService from './index';

// @octokit/rest is ESM-only and would make real HTTP calls, replace the module.
jest.mock('@octokit/rest', () => ({ Octokit: jest.fn() }));

const release = (tagName: string, prerelease = false) => ({
  tag_name: tagName,
  prerelease,
  html_url: `https://github.com/ExpressLRS/ExpressLRS-Configurator/releases/tag/${tagName}`,
});

describe('UpdatesService.checkForNewerReleases', () => {
  let service: UpdatesService;
  let listReleases: jest.Mock;

  // Stub: answers listReleases with a canned GitHub API response.
  const stubResponse = (status: number, data: ReturnType<typeof release>[]) => {
    listReleases = jest.fn().mockResolvedValue({ status, data });
    service.client = { repos: { listReleases } } as unknown as Octokit;
  };

  beforeEach(() => {
    service = new UpdatesService('ExpressLRS', 'ExpressLRS-Configurator');
  });

  it('reports the first newer stable release and skips pre-releases', async () => {
    stubResponse(200, [
      release('v1.8.0-beta.1', true),
      release('v1.7.11'),
      release('v1.7.10'),
    ]);

    const result = await service.checkForNewerReleases('1.7.10');

    expect(result.updateAvailable).toBe(true);
    expect(result.newestVersion).toBe('1.7.11');
    expect(result.releaseUrl).toBe(release('v1.7.11').html_url);
    expect(listReleases).toHaveBeenCalledWith({
      owner: 'ExpressLRS',
      repo: 'ExpressLRS-Configurator',
      per_page: 100,
    });
  });

  it('reports no update when the current version is the newest', async () => {
    stubResponse(200, [release('v1.7.10'), release('v1.7.9')]);

    const result = await service.checkForNewerReleases('1.7.10');

    expect(result.updateAvailable).toBe(false);
    expect(result.newestVersion).toBe('');
  });

  it('reports no update when GitHub returns an error status or no releases', async () => {
    stubResponse(500, [release('v9.9.9')]);
    expect((await service.checkForNewerReleases('1.0.0')).updateAvailable).toBe(
      false,
    );

    stubResponse(200, []);
    expect((await service.checkForNewerReleases('1.0.0')).updateAvailable).toBe(
      false,
    );
  });
});
