import { describe, expect, it, vi, beforeEach } from 'vitest';
import { manifest } from '../src/manifest';

// Mocking needs to happen before imports
vi.mock('../src/manifest', () => ({
  manifest: {
    id: 'org.easynews',
    name: 'Easynews++',
    description: 'Easynews++ Addon',
    version: '1.0.0',
    resources: ['stream'],
    types: ['movie', 'series'],
  },
}));

vi.mock('../src/utils', () => ({
  buildSearchQuery: vi.fn().mockImplementation((type, meta) => {
    return `${meta.name} ${meta.year || ''}`.trim();
  }),
  createStreamPath: vi.fn().mockReturnValue('path/to/stream'),
  createStreamUrl: vi.fn().mockReturnValue('https://easynews.com/stream'),
  getDuration: vi.fn().mockReturnValue('120m'),
  getFileExtension: vi.fn().mockReturnValue('.mp4'),
  getPostTitle: vi.fn().mockReturnValue('Test Movie Title'),
  getQuality: vi.fn().mockReturnValue('1080p'),
  getSize: vi.fn().mockReturnValue('1.5 GB'),
  isBadVideo: vi.fn().mockReturnValue(false),
  logError: vi.fn(),
  matchesTitle: vi.fn().mockReturnValue(true),
  getAlternativeTitles: vi.fn().mockReturnValue(['Alternative Title']),
  isAuthError: vi.fn().mockReturnValue(false),
}));

vi.mock('easynews-plus-plus-api', () => ({
  EasynewsAPI: vi.fn().mockImplementation(() => ({
    search: vi.fn().mockResolvedValue({
      data: [
        {
          '0': 'file-hash-1',
          '4': '1500MB',
          '5': '2023-01-01',
          '10': 'Test Movie Title',
          '11': '.mp4',
          '14': '120m',
          fullres: '1920x1080',
          alangs: ['eng'],
          rawSize: 1500000000,
          passwd: false,
          virus: false,
          type: 'VIDEO',
        },
      ],
    }),
  })),
}));

vi.mock('../src/meta', () => ({
  publicMetaProvider: vi.fn().mockResolvedValue({
    id: 'tt1234567',
    name: 'Test Movie',
    year: 2023,
    type: 'movie',
  }),
}));

vi.mock('../src/i18n', () => ({
  getUILanguage: vi.fn().mockReturnValue('eng'),
  translations: {
    eng: {
      errors: {
        authFailed:
          'Authentication Failed: Invalid username or password\nCheck your credentials & reconfigure addon',
      },
    },
  },
}));

vi.mock('stremio-addon-sdk/src/builder', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      defineStreamHandler: vi.fn().mockImplementation(handler => {
        // Store the handler for testing
        (global as any).streamHandler = handler;
        return handler;
      }),
      getInterface: vi.fn().mockReturnValue({
        manifest,
        stream: {
          handler: (global as any).streamHandler,
        },
      }),
    })),
  };
});

vi.mock('easynews-plus-plus-shared', () => ({
  createLogger: vi.fn().mockReturnValue({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock custom-titles.json
vi.mock('../../../custom-titles.json', () => ({
  default: {
    'Test Movie': ['Test Movie Alt', 'Another Test Title'],
  },
}));

// Mock custom-template
vi.mock('../src/custom-template', () => ({
  default: vi.fn().mockReturnValue('<html>Mocked template</html>'),
}));

// Now import the tested module after all mocks are set up
import { addonInterface, landingHTML } from '../src/addon';

describe('Addon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export addonInterface', () => {
    expect(addonInterface).toBeDefined();
    expect(addonInterface.manifest).toEqual(manifest);
  });

  it('should export landingHTML', () => {
    expect(landingHTML).toBeDefined();
    expect(landingHTML).toBe('<html>Mocked template</html>');
  });

  it('should handle stream request with valid credentials', async () => {
    // Get the stream handler
    const streamHandler = (global as any).streamHandler;
    expect(streamHandler).toBeDefined();

    // Call the handler with test data
    const result = await streamHandler({
      id: 'tt1234567',
      type: 'movie',
      config: {
        username: 'testuser',
        password: 'testpass',
      },
    });

    // Verify the result
    expect(result).toHaveProperty('streams');
    expect(Array.isArray(result.streams)).toBe(true);
    expect(result.streams.length).toBeGreaterThan(0);

    // Verify stream properties
    const stream = result.streams[0];
    expect(stream).toHaveProperty('name');
    expect(stream).toHaveProperty('description');
    expect(stream).toHaveProperty('url');
    expect(stream.name).toContain('Easynews++');
  });

  it('should handle stream request with missing credentials', async () => {
    // Get the stream handler
    const streamHandler = (global as any).streamHandler;

    // Call the handler with missing credentials
    const result = await streamHandler({
      id: 'tt1234567',
      type: 'movie',
      config: {
        username: '',
        password: '',
      },
    });

    // Verify the auth error message
    expect(result).toHaveProperty('streams');
    expect(Array.isArray(result.streams)).toBe(true);
    expect(result.streams.length).toBe(1);
    expect(result.streams[0].name).toBe('Easynews++ Auth Error');
    expect(result.streams[0].description).toBe(
      'Authentication Failed: Invalid username or password\nCheck your credentials & reconfigure addon'
    );
  });

  it('should handle non-IMDb IDs', async () => {
    // Get the stream handler
    const streamHandler = (global as any).streamHandler;

    // Call the handler with a non-IMDb ID
    const result = await streamHandler({
      id: 'kitsu:1234567',
      type: 'movie',
      config: {
        username: 'testuser',
        password: 'testpass',
      },
    });

    // Verify empty result
    expect(result).toHaveProperty('streams');
    expect(Array.isArray(result.streams)).toBe(true);
    expect(result.streams.length).toBe(0);
  });

  it('should filter and sort streams based on config', async () => {
    // Get the stream handler
    const streamHandler = (global as any).streamHandler;

    // Call the handler with custom config
    const result = await streamHandler({
      id: 'tt1234567',
      type: 'movie',
      config: {
        username: 'testuser',
        password: 'testpass',
        strictTitleMatching: 'true',
        preferredLanguage: 'eng',
        sortingPreference: 'quality_first',
        showQualities: '1080p',
        maxResultsPerQuality: '3',
        maxFileSize: '2',
      },
    });

    // Verify the result
    expect(result).toHaveProperty('streams');
    expect(Array.isArray(result.streams)).toBe(true);
  });
});
