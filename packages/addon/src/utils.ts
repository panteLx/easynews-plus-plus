import { EasynewsSearchResponse, FileData } from 'easynews-plus-plus-api';
import { MetaProviderResponse } from './meta';
import { ContentType } from 'stremio-addon-sdk';
import { parse as parseTorrentTitle } from 'parse-torrent-title';
import * as fs from 'fs';

// Import the custom titles JSON directly
import customTitlesJson from '../../../custom-titles.json';

export function isBadVideo(file: FileData) {
  const duration = file['14'] ?? '';

  return (
    // <= 5 minutes in duration
    duration.match(/^\d+s/) ||
    duration.match('^[0-5]m') ||
    // password protected
    file.passwd ||
    // malicious
    file.virus ||
    // not a video
    file.type.toUpperCase() !== 'VIDEO' ||
    // very small file size (likely a sample or broken file, < 20MB)
    (file.rawSize && file.rawSize < 20 * 1024 * 1024)
  );
}

/**
 * Sanitize a title for case-insensitive comparison.
 * Handles special characters, accented letters, and common separators.
 */
export function sanitizeTitle(title: string) {
  return (
    title
      // replace common symbols with words
      .replaceAll('&', 'and')
      // replace common separators (., _, -, whitespace) with a single space
      .replace(/[\.\-_:\s]+/g, ' ')
      // handle brackets and parentheses - replace with space
      .replace(/[\[\]\(\){}]/g, ' ')
      // remove non-alphanumeric characters except for accented characters
      .replace(/[^\w\sÀ-ÿ]/g, '')
      // to lowercase + remove spaces at the beginning and end
      .toLowerCase()
      .trim()
  );
}

/**
 * Improved title matching with more accurate results
 * @param title The content title to check
 * @param query The search query to match against
 * @param strict Whether to perform exact matching (for movies)
 * @returns Whether the title matches the query
 */
export function matchesTitle(title: string, query: string, strict: boolean) {
  const sanitizedQuery = sanitizeTitle(query);
  const sanitizedTitle = sanitizeTitle(title);

  // Extract the main title part for comparison (excluding episode info)
  const mainQueryPart = sanitizedQuery.split(/s\d+e\d+/i)[0].trim();
  const isSeriesQuery = /s\d+e\d+/i.test(sanitizedQuery);

  // For strict mode, we require an exact title match or proper prefix match
  if (strict) {
    // For series with season/episode pattern like S01E01
    const seasonEpisodePattern = /s\d+e\d+/i;
    const hasSeasonEpisodePattern = seasonEpisodePattern.test(sanitizedQuery);

    if (hasSeasonEpisodePattern) {
      // 1. Check if the title STARTS with the main part of the query (not just contains it)
      // This catches cases like "the.state.s01e01" but excludes "how.the.states.got.their.shapes.s01e01"
      if (!sanitizedTitle.startsWith(mainQueryPart)) {
        return false;
      }

      // 2. Make sure the title contains the season/episode pattern
      const seMatch = sanitizedQuery.match(seasonEpisodePattern);
      if (seMatch && seMatch[0]) {
        const pattern = seMatch[0].toLowerCase();
        return sanitizedTitle.includes(pattern);
      }
    }

    // For movies or other non-series content
    const { title: parsedTitle, year } = parseTorrentTitle(title);

    if (parsedTitle) {
      const sanitizedParsedTitle = sanitizeTitle(parsedTitle);

      // Check for exact match, or match with year
      if (sanitizedParsedTitle === sanitizedQuery) {
        return true;
      }

      // If query has a year and parsed title has a year, both must match
      const queryYearMatch = sanitizedQuery.match(/\b(\d{4})\b/);
      if (queryYearMatch && year) {
        const queryYear = queryYearMatch[1];
        return (
          sanitizedParsedTitle.replace(queryYear, '').trim() ===
            sanitizedQuery.replace(queryYear, '').trim() && year.toString() === queryYear
        );
      }
    }

    // If we're in strict mode and haven't matched by now, return false
    return false;
  }

  // Non-strict mode below (original behavior)

  // For series with season/episode pattern like S01E01
  const seasonEpisodePattern = /s\d+e\d+/i;
  const hasSeasonEpisodePattern = seasonEpisodePattern.test(sanitizedQuery);

  if (hasSeasonEpisodePattern) {
    // Extract season/episode pattern
    const seMatch = sanitizedQuery.match(seasonEpisodePattern);
    if (seMatch && seMatch[0]) {
      const pattern = seMatch[0].toLowerCase();
      return sanitizedTitle.includes(pattern);
    }
  }

  // Check that all words in the query appear in the title
  const queryWords = sanitizedQuery.split(/\s+/);
  const allWordsMatch = queryWords.every(word => {
    // Skip very short words (1-2 chars) to avoid false positives
    if (word.length <= 2) return true;
    return sanitizedTitle.includes(word);
  });

  // For multiple word queries, ensure the title contains the full phrase
  // or at least a high percentage of matching words
  if (queryWords.length > 1 && !strict) {
    // Count matching words
    const matchingWords = queryWords.filter(
      word => word.length > 2 && sanitizedTitle.includes(word)
    ).length;

    // If more than 70% of significant words match, consider it a match
    const significantWords = queryWords.filter(word => word.length > 2).length;
    if (significantWords > 0) {
      const matchRatio = matchingWords / significantWords;
      return matchRatio >= 0.7;
    }
  }

  return allWordsMatch;
}

export function createStreamUrl(
  { downURL, dlFarm, dlPort }: Pick<EasynewsSearchResponse, 'downURL' | 'dlFarm' | 'dlPort'>,
  username: string,
  password: string
) {
  // For streaming, we can still use the username:password@ format in the URL
  // as it will be handled by media players, not the fetch API
  return `${downURL.replace('https://', `https://${username}:${password}@`)}/${dlFarm}/${dlPort}`;
}

export function createStreamPath(file: FileData) {
  const postHash = file['0'] ?? '';
  const postTitle = file['10'] ?? '';
  const ext = file['11'] ?? '';

  return `${postHash}${ext}/${postTitle}${ext}`;
}

export function getFileExtension(file: FileData) {
  return file['2'] ?? '';
}

export function getPostTitle(file: FileData) {
  return file['10'] ?? '';
}

export function getDuration(file: FileData) {
  return file['14'] ?? '';
}

export function getSize(file: FileData) {
  return file['4'] ?? '';
}

/**
 * Extract video quality information from the title or fallback resolution
 */
export function getQuality(title: string, fallbackResolution?: string): string | undefined {
  const { resolution } = parseTorrentTitle(title);

  // Try to find quality indicators in the title if resolution not found
  if (!resolution && title) {
    const qualityPatterns = [
      // Common resolution patterns
      { pattern: /\b720p\b/i, quality: '720p' },
      { pattern: /\b1080p\b/i, quality: '1080p' },
      { pattern: /\b2160p\b/i, quality: '4K/2160p' },
      { pattern: /\b4k\b/i, quality: '4K' },
      { pattern: /\buhd\b/i, quality: '4K/UHD' },
      { pattern: /\bhdr\b/i, quality: 'HDR' },
      // Common quality indicators
      { pattern: /\bhq\b/i, quality: 'HQ' },
      { pattern: /\bbdrip\b/i, quality: 'BDRip' },
      { pattern: /\bbluray\b/i, quality: 'BluRay' },
      { pattern: /\bweb-?dl\b/i, quality: 'WEB-DL' },
    ];

    for (const { pattern, quality } of qualityPatterns) {
      if (pattern.test(title)) {
        return quality;
      }
    }
  }

  return resolution ?? fallbackResolution;
}

export function createThumbnailUrl(res: EasynewsSearchResponse, file: FileData) {
  const id = file['0'];
  const idChars = id.slice(0, 3);
  const thumbnailSlug = file['10'];
  return `${res.thumbURL}${idChars}/pr-${id}.jpg/th-${thumbnailSlug}.jpg`;
}

/**
 * @param value String to extract digits from
 * @returns The first sequence of digits found in the string or undefined
 */
export function extractDigits(value: string) {
  if (!value) {
    return undefined;
  }

  const match = value.match(/\d+/);

  if (match) {
    return parseInt(match[0], 10);
  }

  return undefined;
}

/**
 * Gets potential alternative titles based on the original title
 * @param title The original title
 * @param customTitlesInput Optional custom titles object
 * @returns Array of potential alternative titles including the original one
 */
export function getAlternativeTitles(
  title: string,
  customTitlesInput: Record<string, string[]> = customTitlesJson
): string[] {
  // Use the provided (or default) object
  const combined = customTitlesInput;

  // If no custom titles available, just return the original title
  if (Object.keys(combined).length === 0) {
    return [title];
  }

  // First check for exact matches
  if (combined[title]) {
    return [title, ...combined[title]];
  }

  // Check for case-insensitive matches
  const lowerCaseTitle = title.toLowerCase();
  for (const [key, values] of Object.entries(combined)) {
    if (key.toLowerCase() === lowerCaseTitle) {
      return [title, ...values];
    }
  }

  // Then check for partial matches (e.g. "The Lion King 2" should match "The Lion King")
  const alternatives: string[] = [title];

  let foundMatch = false;

  // Check for sub-string matches
  for (const [englishTitle, customTitles] of Object.entries(combined)) {
    // Skip checking very short titles (3 characters or less) to avoid false matches
    if (englishTitle.length <= 3) continue;

    if (title.toLowerCase().includes(englishTitle.toLowerCase())) {
      foundMatch = true;
      // Title contains a known English title, add the custom equivalents
      for (const customTitle of customTitles) {
        const customTitleReplaced = title.replace(new RegExp(englishTitle, 'i'), customTitle);
        if (!alternatives.includes(customTitleReplaced)) {
          alternatives.push(customTitleReplaced);
        }
      }
    }

    // Also check if the title might be a custom title we know
    for (const customTitle of customTitles) {
      // Skip checking very short titles to avoid false matches
      if (customTitle.length <= 3) continue;

      if (title.toLowerCase().includes(customTitle.toLowerCase())) {
        foundMatch = true;
        // Title contains a known custom title, add the English equivalent
        const englishTitle1 = title.replace(new RegExp(customTitle, 'i'), englishTitle);
        if (!alternatives.includes(englishTitle1)) {
          alternatives.push(englishTitle1);
        }
      }
    }
  }

  // Log whether we found any matches
  if (foundMatch) {
    logger.info(`Found ${alternatives.length - 1} alternative titles for "${title}"`);
  } else {
    logger.info(`No alternative titles found for "${title}"`);
  }

  return alternatives;
}

/**
 * Build a search query for different content types
 */
export function buildSearchQuery(type: ContentType, meta: MetaProviderResponse) {
  let query = `${meta.name}`;

  if (type === 'series') {
    if (meta.season) {
      query += ` S${meta.season.toString().padStart(2, '0')}`;
    }

    if (meta.episode) {
      query += `${!meta.season ? ' ' : ''}E${meta.episode.toString().padStart(2, '0')}`;
    }
  }

  if (meta.year) {
    query += ` ${meta.year}`;
  }

  return query;
}

/**
 * Get the addon version from package.json
 * @returns Version string
 */
export function getVersion(): string {
  try {
    const version = require('../../../package.json').version;
    return version;
  } catch (error) {
    return 'unknown-version';
  }
}

/**
 * Log levels for configuration
 */
export enum LogLevel {
  NONE = -1, // No logging at all
  ERROR = 0, // Critical errors that prevent operation
  WARN = 1, // Warnings about potential issues
  INFO = 2, // General operational information
  DEBUG = 3, // Detailed information for debugging
  TRACE = 4, // Very detailed tracing information
}

/**
 * Parse a string log level to enum value
 * @param level The string log level to parse
 * @returns The LogLevel enum value
 */
export function parseLogLevel(level: string | undefined): LogLevel {
  if (!level) return LogLevel.INFO;

  switch (level.toLowerCase()) {
    case 'none':
      return LogLevel.NONE;
    case 'error':
      return LogLevel.ERROR;
    case 'warn':
    case 'warning':
      return LogLevel.WARN;
    case 'info':
      return LogLevel.INFO;
    case 'debug':
      return LogLevel.DEBUG;
    case 'trace':
      return LogLevel.TRACE;
    default:
      // Try to parse as number
      const numLevel = parseInt(level, 10);
      if (!isNaN(numLevel) && numLevel >= LogLevel.NONE && numLevel <= LogLevel.TRACE) {
        return numLevel;
      }
      return LogLevel.INFO;
  }
}

/**
 * Get initial log level from environment or default to INFO
 * @returns The initial log level to use
 */
function getInitialLogLevel(): LogLevel {
  if (typeof process !== 'undefined' && process.env) {
    return parseLogLevel(process.env.EASYNEWS_LOG_LEVEL);
  }
  return LogLevel.INFO;
}

/**
 * Format a timestamp for logging
 * @returns Formatted timestamp [HH:MM:SS]
 */
function getTimestamp(): string {
  const now = new Date();
  return `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
}

/**
 * Logger module for consistent logging across the addon
 *
 * Log levels can be set via:
 * 1. Environment variable: EASYNEWS_LOG_LEVEL (none, error, warn, info, debug, trace)
 * 2. AddonConfig.logLevel in the configuration
 * 3. Programmatically via logger.setLevel()
 */
export const logger = {
  /**
   * Current log level
   */
  level: getInitialLogLevel(),

  /**
   * Get log level name from current level
   * @returns The name of the current log level
   */
  getLevelName: (): string => {
    switch (logger.level) {
      case LogLevel.NONE:
        return 'NONE';
      case LogLevel.ERROR:
        return 'ERROR';
      case LogLevel.WARN:
        return 'WARN';
      case LogLevel.INFO:
        return 'INFO';
      case LogLevel.DEBUG:
        return 'DEBUG';
      case LogLevel.TRACE:
        return 'TRACE';
      default:
        return `UNKNOWN(${logger.level})`;
    }
  },

  /**
   * Set the logging level
   * @param level The log level to set
   */
  setLevel: (level: LogLevel | string) => {
    if (typeof level === 'string') {
      logger.level = parseLogLevel(level);
    } else {
      logger.level = level;
    }

    // Log the level change at the level that will be visible
    if (logger.level >= LogLevel.DEBUG) {
      console.debug(
        `${logger.formatPrefix()} [DEBUG] Log level changed to: ${logger.getLevelName()}`
      );
    }
  },

  /**
   * Format a log prefix with version and timestamp
   */
  formatPrefix: () => {
    return `[Easynews++ v${getVersion()}]${logger.level >= LogLevel.DEBUG ? getTimestamp() : ''}`;
  },

  /**
   * Log trace messages (most detailed level)
   * @param message The message to log
   * @param optionalParams Additional parameters to log
   */
  trace: (message: string, ...optionalParams: any[]) => {
    if (logger.level >= LogLevel.TRACE) {
      console.debug(`${logger.formatPrefix()} [TRACE] ${message}`, ...optionalParams);
    }
  },

  /**
   * Log debug messages
   * @param message The message to log
   * @param optionalParams Additional parameters to log
   */
  debug: (message: string, ...optionalParams: any[]) => {
    if (logger.level >= LogLevel.DEBUG) {
      console.debug(`${logger.formatPrefix()} [DEBUG] ${message}`, ...optionalParams);
    }
  },

  /**
   * Log informational messages
   * @param message The message to log
   * @param optionalParams Additional parameters to log
   */
  info: (message: string, ...optionalParams: any[]) => {
    if (logger.level >= LogLevel.INFO) {
      console.log(`${logger.formatPrefix()} ${message}`, ...optionalParams);
    }
  },

  /**
   * Log warning messages
   * @param message The message to log
   * @param optionalParams Additional parameters to log
   */
  warn: (message: string, ...optionalParams: any[]) => {
    if (logger.level >= LogLevel.WARN) {
      console.warn(`${logger.formatPrefix()} [WARN] ${message}`, ...optionalParams);
    }
  },

  /**
   * Log error messages
   * @param message The message to log
   * @param optionalParams Additional parameters to log
   */
  error: (message: string, ...optionalParams: any[]) => {
    if (logger.level >= LogLevel.ERROR) {
      console.error(`${logger.formatPrefix()} [ERROR] ${message}`, ...optionalParams);
    }
  },
};

export function logError(message: { message: string; error: unknown; context: unknown }) {
  logger.error(`Error: ${message.message}`, message);
}

export function capitalizeFirstLetter(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
