import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  matchesTitle,
  sanitizeTitle,
  isBadVideo,
  getQuality,
  extractDigits,
  capitalizeFirstLetter,
  parseLogLevel,
  LogLevel,
  createStreamUrl,
  createStreamPath,
  getFileExtension,
  getPostTitle,
  getDuration,
  getSize,
  getAlternativeTitles,
  buildSearchQuery,
} from './utils.js';
import { FileData } from 'easynews-plus-plus-api';
import * as parseTorrentTitle from 'parse-torrent-title';
import type { ContentType } from 'stremio-addon-sdk';

vi.mock('parse-torrent-title', () => ({
  parse: vi.fn(),
}));

vi.mock('./utils.js', async () => {
  const actual = await vi.importActual('./utils.js');
  return {
    ...actual,
    logger: {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    },
  };
});

describe('sanitizeTitle', () => {
  it.each([
    ['Three Colors: Blue (1993)', 'three colors blue  1993'],
    ['Willy Wonka & the Chocolate Factory (1973)', 'willy wonka and the chocolate factory  1973'],
    ["America's got talent", 'americas got talent'],
    ['WALL-E (2008)', 'wall e  2008'],
    ['WALL·E', 'walle'],
    [
      'Mission: Impossible - Dead Reckoning Part One (2023)',
      'mission impossible dead reckoning part one  2023',
    ],
    [
      'The Lord of the Rings: The Fellowship of the Ring',
      'the lord of the rings the fellowship of the ring',
    ],
    ['Once Upon a Time ... in Hollywood', 'once upon a time in hollywood'],
    ['Am_er-ic.a', 'am er ic a'],
    ['Amérîcâ', 'amérîcâ'],
    ["D'où vient-il?", 'doù vient il'],
    ['Fête du cinéma', 'fête du cinéma'],
    ['Star Wars: Episode IV - A New Hope', 'star wars episode iv a new hope'],
    ['Breaking Bad: S01E01', 'breaking bad s01e01'],
    ['The 100 (TV Series)', 'the 100  tv series'],
  ])("sanitizes the title '%s'", (input, expected) => {
    expect(sanitizeTitle(input)).toBe(expected);
  });
});

describe('matchesTitle', () => {
  it.each([
    ["America's Next Top Model", "America's", true],
    ["America's Next Top Model", 'Americas', true],
    ['Fête du cinéma', 'cinema', false],
    ['Fête du cinéma', 'cinéma', true],
    ['Fête du cinéma', 'Fete', false],
    ['Fête du cinéma', 'Fête', true],
    ['Am_er-ic.a the Beautiful', 'America the Beautiful', false],
    ['Am_er-ic.a the Beautiful', 'Am er ic a the Beautiful', true],
    ['Breaking Bad S01E01', 'breaking bad s01e01', true],
    ['Breaking Bad', 'breaking bad s01e01', false],
    ['Game of Thrones s03E05', 'Game of Thrones', true],
    ['Game of Thrones s03E05', 'Game of Thrones s03e05', true],
    ['The Walking Dead S10E16', 'the walking dead s10e16', true],
    ['The Walking Dead S10E16', 'the walking dead s10e15', false],
    ['Stranger Things 4K HDR', 'stranger things', true],
    ['Interstellar (2014) 1080p', 'interstellar 2014', true],
  ])("matches the title '%s' with query '%s'", (title, query, expected) => {
    expect(matchesTitle(title, query, false)).toBe(expected);
  });

  it('handles strict mode properly', () => {
    (parseTorrentTitle.parse as any).mockImplementation((title: string) => {
      if (title === 'The Matrix 1999') {
        return {
          title: 'The Matrix',
          year: 1999,
        };
      }
      return {};
    });

    expect(matchesTitle('The Matrix 1999', 'The Matrix 1999', true)).toBe(true);
    expect(matchesTitle('The Matrix 1999', 'The Matrix', true)).toBe(true);
  });
});

describe('isBadVideo', () => {
  it('identifies short videos as bad', () => {
    const mockShortVideo = {
      '0': '123456',
      '10': 'Short Video',
      '11': '.mp4',
      '14': '30s',
      type: 'VIDEO',
      rawSize: 30 * 1024 * 1024,
      passwd: false,
      virus: false,
    } as unknown as FileData;

    expect(isBadVideo(mockShortVideo)).toBeTruthy();

    const mockVeryShortVideo = {
      '0': '123456',
      '10': 'Short Video',
      '11': '.mp4',
      '14': '3m',
      type: 'VIDEO',
      rawSize: 30 * 1024 * 1024,
      passwd: false,
      virus: false,
    } as unknown as FileData;
    expect(isBadVideo(mockVeryShortVideo)).toBeTruthy();

    const mockLongerVideo = {
      '0': '123456',
      '10': 'Longer Video',
      '11': '.mp4',
      '14': '6m',
      type: 'VIDEO',
      rawSize: 30 * 1024 * 1024,
      passwd: false,
      virus: false,
    } as unknown as FileData;
    expect(isBadVideo(mockLongerVideo)).toBeFalsy();
  });

  it('identifies password protected videos as bad', () => {
    const protectedVideo = {
      '0': '123456',
      '10': 'Protected Video',
      '11': '.mp4',
      '14': '60m',
      passwd: true,
      type: 'VIDEO',
      rawSize: 30 * 1024 * 1024,
      virus: false,
    } as unknown as FileData;
    expect(isBadVideo(protectedVideo)).toBeTruthy();

    const unprotectedVideo = {
      '0': '123456',
      '10': 'Unprotected Video',
      '11': '.mp4',
      '14': '60m',
      passwd: false,
      type: 'VIDEO',
      rawSize: 30 * 1024 * 1024,
      virus: false,
    } as unknown as FileData;
    expect(isBadVideo(unprotectedVideo)).toBeFalsy();
  });

  it('identifies malicious videos as bad', () => {
    const maliciousVideo = {
      '0': '123456',
      '10': 'Malicious Video',
      '11': '.mp4',
      '14': '60m',
      virus: true,
      type: 'VIDEO',
      rawSize: 30 * 1024 * 1024,
      passwd: false,
    } as unknown as FileData;
    expect(isBadVideo(maliciousVideo)).toBeTruthy();

    const cleanVideo = {
      '0': '123456',
      '10': 'Clean Video',
      '11': '.mp4',
      '14': '60m',
      virus: false,
      type: 'VIDEO',
      rawSize: 30 * 1024 * 1024,
      passwd: false,
    } as unknown as FileData;
    expect(isBadVideo(cleanVideo)).toBeFalsy();
  });

  it('identifies non-video files as bad', () => {
    const audioFile = {
      '0': '123456',
      '10': 'Audio File',
      '11': '.mp3',
      '14': '60m',
      type: 'AUDIO',
      rawSize: 30 * 1024 * 1024,
      passwd: false,
      virus: false,
    } as unknown as FileData;
    expect(isBadVideo(audioFile)).toBeTruthy();

    const imageFile = {
      '0': '123456',
      '10': 'Image File',
      '11': '.jpg',
      '14': '60m',
      type: 'IMAGE',
      rawSize: 30 * 1024 * 1024,
      passwd: false,
      virus: false,
    } as unknown as FileData;
    expect(isBadVideo(imageFile)).toBeTruthy();

    const videoFile = {
      '0': '123456',
      '10': 'Video File',
      '11': '.mp4',
      '14': '60m',
      type: 'VIDEO',
      rawSize: 30 * 1024 * 1024,
      passwd: false,
      virus: false,
    } as unknown as FileData;
    expect(isBadVideo(videoFile)).toBeFalsy();
  });

  it('identifies small files as bad', () => {
    const smallVideo = {
      '0': '123456',
      '10': 'Small Video',
      '11': '.mp4',
      '14': '60m',
      rawSize: 10 * 1024 * 1024,
      type: 'VIDEO',
      passwd: false,
      virus: false,
    } as unknown as FileData;
    expect(isBadVideo(smallVideo)).toBeTruthy();

    const largeVideo = {
      '0': '123456',
      '10': 'Large Video',
      '11': '.mp4',
      '14': '60m',
      rawSize: 30 * 1024 * 1024,
      type: 'VIDEO',
      passwd: false,
      virus: false,
    } as unknown as FileData;
    expect(isBadVideo(largeVideo)).toBeFalsy();
  });

  it('handles combinations of bad properties', () => {
    const badCombination = {
      '0': '123456',
      '10': 'Bad Combination',
      '11': '.mp4',
      '14': '60m',
      rawSize: 50 * 1024 * 1024,
      type: 'VIDEO',
      passwd: true,
      virus: false,
    } as unknown as FileData;
    expect(isBadVideo(badCombination)).toBeTruthy();
  });
});

describe('getQuality', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('extracts resolution from title using parseTorrentTitle', () => {
    (parseTorrentTitle.parse as any).mockReturnValueOnce({
      resolution: '720p',
    });
    (parseTorrentTitle.parse as any).mockReturnValueOnce({
      resolution: '1080p',
    });
    (parseTorrentTitle.parse as any).mockReturnValueOnce({
      resolution: '2160p',
    });
    (parseTorrentTitle.parse as any).mockReturnValueOnce({
      resolution: undefined,
    });

    expect(getQuality('Movie Title 720p')).toBe('720p');
    expect(getQuality('Movie Title 1080p')).toBe('1080p');
  });

  it('uses fallback resolution when title has no quality info', () => {
    (parseTorrentTitle.parse as any).mockReturnValue({ resolution: undefined });
    expect(getQuality('Movie Title', '720p')).toBe('720p');
    expect(getQuality('Movie Title')).toBeUndefined();
  });

  it('handles different resolution formats', () => {
    vi.resetAllMocks();
    (parseTorrentTitle.parse as any).mockReturnValue({ resolution: undefined });
    expect(getQuality('Movie Title 4K HDR')).toBe('4K');
    expect(getQuality('Movie Title UHD 2160p')).toBe('4K/2160p');
    expect(getQuality('Movie Title 720p HEVC')).toBe('720p');
  });
});

describe('extractDigits', () => {
  it('extracts digits from strings', () => {
    expect(extractDigits('123')).toBe(123);
    expect(extractDigits('abc123')).toBe(123);
    expect(extractDigits('123abc')).toBe(123);
    expect(extractDigits('abc123def')).toBe(123);
  });

  it('returns undefined for strings without digits', () => {
    expect(extractDigits('abc')).toBeUndefined();
    expect(extractDigits('')).toBeUndefined();
  });

  it('extracts multi-digit numbers', () => {
    expect(extractDigits('abc12345def')).toBe(12345);
    expect(extractDigits('Season 2 Episode 10')).toBe(2);
  });
});

describe('capitalizeFirstLetter', () => {
  it('capitalizes the first letter of a string', () => {
    expect(capitalizeFirstLetter('hello')).toBe('Hello');
    expect(capitalizeFirstLetter('world')).toBe('World');
    expect(capitalizeFirstLetter('hello world')).toBe('Hello world');
  });

  it('handles empty strings', () => {
    expect(capitalizeFirstLetter('')).toBe('');
  });

  it('handles already capitalized strings', () => {
    expect(capitalizeFirstLetter('Hello')).toBe('Hello');
    expect(capitalizeFirstLetter('HELLO')).toBe('HELLO');
  });

  it('handles strings with non-letter first characters', () => {
    expect(capitalizeFirstLetter('123abc')).toBe('123abc');
    expect(capitalizeFirstLetter(' hello')).toBe(' hello');
  });
});

describe('parseLogLevel', () => {
  it('parses valid log levels', () => {
    expect(parseLogLevel('ERROR')).toBe(LogLevel.ERROR);
    expect(parseLogLevel('WARN')).toBe(LogLevel.WARN);
    expect(parseLogLevel('INFO')).toBe(LogLevel.INFO);
    expect(parseLogLevel('DEBUG')).toBe(LogLevel.DEBUG);
    expect(parseLogLevel('TRACE')).toBe(LogLevel.TRACE);
  });

  it('handles case-insensitive log levels', () => {
    expect(parseLogLevel('error')).toBe(LogLevel.ERROR);
    expect(parseLogLevel('warn')).toBe(LogLevel.WARN);
    expect(parseLogLevel('info')).toBe(LogLevel.INFO);
    expect(parseLogLevel('debug')).toBe(LogLevel.DEBUG);
    expect(parseLogLevel('trace')).toBe(LogLevel.TRACE);
  });

  it('returns INFO level for undefined input', () => {
    expect(parseLogLevel(undefined)).toBe(LogLevel.INFO);
  });

  it('returns INFO level for invalid input', () => {
    expect(parseLogLevel('INVALID')).toBe(LogLevel.INFO);
  });

  it('returns INFO level for mixed case input', () => {
    expect(parseLogLevel('InFo')).toBe(LogLevel.INFO);
    expect(parseLogLevel('dEbUg')).toBe(LogLevel.DEBUG);
  });
});

describe('createStreamUrl', () => {
  it('creates a stream URL with authentication', () => {
    const response = {
      downURL: 'https://example.com/down',
      dlFarm: 'farm1',
      dlPort: 'port1',
    } as unknown as any;

    const url = createStreamUrl(response, 'testuser', 'testpass');
    expect(url).toBe('https://testuser:testpass@example.com/down/farm1/port1');
  });

  it('handles different URL formats', () => {
    const response = {
      downURL: 'https://cdn.example.com/download',
      dlFarm: 'farm2',
      dlPort: 'port2',
    } as unknown as any;

    const url = createStreamUrl(response, 'user@domain.com', 'complex@pass!123');
    expect(url).toBe(
      'https://user@domain.com:complex@pass!123@cdn.example.com/download/farm2/port2'
    );
  });
});

describe('createStreamPath', () => {
  it('creates a valid stream path from file data', () => {
    const file = {
      '0': 'abc123',
      '10': 'movie_title',
      '11': '.mp4',
    } as unknown as FileData;

    const path = createStreamPath(file);
    expect(path).toBe('abc123.mp4/movie_title.mp4');
  });

  it('handles missing data', () => {
    const file = {
      '0': 'abc123',
    } as unknown as FileData;

    const path = createStreamPath(file);
    expect(path).toBe('abc123/');
  });
});

describe('getFileExtension, getPostTitle, getDuration, getSize', () => {
  const file = {
    '2': '.mp4',
    '4': '1.2GB',
    '10': 'Sample Video',
    '14': '120m',
  } as unknown as FileData;

  it('extracts file extension correctly', () => {
    expect(getFileExtension(file)).toBe('.mp4');
    expect(getFileExtension({} as FileData)).toBe('');
  });

  it('extracts post title correctly', () => {
    expect(getPostTitle(file)).toBe('Sample Video');
    expect(getPostTitle({} as FileData)).toBe('');
  });

  it('extracts duration correctly', () => {
    expect(getDuration(file)).toBe('120m');
    expect(getDuration({} as FileData)).toBe('');
  });

  it('extracts size correctly', () => {
    expect(getSize(file)).toBe('1.2GB');
    expect(getSize({} as FileData)).toBe('');
  });
});

describe('getAlternativeTitles', () => {
  it('returns alternative titles from custom titles input', () => {
    const mockCustomTitles = {
      matrix: ['The Matrix', 'Matrix', 'The Matrix 1999'],
    };

    const alternatives = getAlternativeTitles('matrix', mockCustomTitles);
    expect(alternatives).toEqual(['matrix', 'The Matrix', 'Matrix', 'The Matrix 1999']);
  });

  it('returns empty array when no alternatives found', () => {
    const mockCustomTitles = {
      matrix: ['The Matrix', 'Matrix'],
    };

    const alternatives = getAlternativeTitles('inception', mockCustomTitles);
    expect(alternatives).toEqual(['inception']);
  });
});

describe('buildSearchQuery', () => {
  it('builds a search query for a movie', () => {
    const meta = {
      name: 'The Matrix',
      type: 'movie',
      year: 1999,
    };

    const query = buildSearchQuery('movie' as ContentType, meta as any);
    expect(query).toContain('The Matrix');
    expect(query).toContain('1999');
  });

  it('builds a search query for a series with episode information', () => {
    const meta = {
      name: 'Breaking Bad',
      type: 'series',
      season: 1,
      episode: 1,
    };

    const query = buildSearchQuery('series' as ContentType, meta as any);
    expect(query).toContain('Breaking Bad');
    expect(query).toContain('S01E01');
  });

  it('handles undefined episode information', () => {
    const meta = {
      name: 'Friends',
      type: 'series',
    };

    const query = buildSearchQuery('series' as ContentType, meta as any);
    expect(query).toBe('Friends');
  });
});
