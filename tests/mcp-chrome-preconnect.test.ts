import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: () => '/tmp/open-cowork-test',
    getVersion: () => '0.0.0',
  },
  BrowserWindow: {
    getAllWindows: () => [],
  },
}));

import { MCPManager, type MCPServerConfig } from '../src/main/mcp/mcp-manager';

type ChromePreconnectInternals = {
  ensureChromeDebugPortBeforeConnect: (config: MCPServerConfig) => Promise<void>;
  startChromeWithDebugging: ReturnType<typeof vi.fn>;
  waitForChromeDebugPort: ReturnType<typeof vi.fn>;
};

function chromeConfig(): MCPServerConfig {
  return {
    id: 'chrome',
    name: 'Chrome',
    type: 'stdio',
    command: 'npx',
    args: ['-y', 'chrome-devtools-mcp@latest', '--browser-url', 'http://localhost:9222'],
    enabled: true,
  };
}

describe('Chrome MCP pre-connect readiness', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts Chrome before connecting when the debug port is unavailable', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    vi.stubGlobal('fetch', fetchMock);

    const manager = new MCPManager() as unknown as MCPManager & ChromePreconnectInternals;
    manager.startChromeWithDebugging = vi.fn().mockResolvedValue(undefined);
    manager.waitForChromeDebugPort = vi.fn().mockResolvedValue(true);

    await manager.ensureChromeDebugPortBeforeConnect(chromeConfig());

    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:9222/json/version', {
      signal: expect.any(AbortSignal),
    });
    expect(manager.startChromeWithDebugging).toHaveBeenCalledTimes(1);
    expect(manager.waitForChromeDebugPort).toHaveBeenCalledWith(15, 1000);
  });

  it('does not touch Chrome for non-Chrome MCP servers', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const manager = new MCPManager() as unknown as MCPManager & ChromePreconnectInternals;
    manager.startChromeWithDebugging = vi.fn();
    manager.waitForChromeDebugPort = vi.fn();

    await manager.ensureChromeDebugPortBeforeConnect({
      id: 'other',
      name: 'Other',
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@example/server'],
      enabled: true,
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(manager.startChromeWithDebugging).not.toHaveBeenCalled();
    expect(manager.waitForChromeDebugPort).not.toHaveBeenCalled();
  });
});
