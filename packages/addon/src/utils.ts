import { EasynewsSearchResponse, FileData } from 'easynews-plus-plus-api';
import { MetaProviderResponse } from './meta';
import { ContentType } from 'stremio-addon-sdk';
import { parse as parseTorrentTitle } from 'parse-torrent-title';
import path from 'path';
import dotenv from 'dotenv';
import * as winston from 'winston';

// Import the custom titles JSON directly
import customTitlesJson from '../../../custom-titles.json';

function loadEnv() {
  // Skip .env loading for Cloudflare Workers environment
  if (process.env.CLOUDFLARE === 'true') {
    console.log('Cloudflare environment detected, skipping .env file loading');
    return;
  }

  try {
    // Load environment variables from env file in project root
    const configPath = path.resolve('../../.env');
    const result = dotenv.config({ path: configPath });

    // Log the result of loading the environment config
    if (result.error) {
      console.warn('Error loading .env. Continuing with default values.');
    } else {
      console.log('Environment configuration loaded successfully');
    }
  } catch (error) {
    console.error('Error while trying to load .env file:', error);
  }
}

// Only load .env in non-Cloudflare environments
if (typeof process !== 'undefined' && !process.env.CLOUDFLARE) {
  loadEnv();
}

// Add interface to declare the function with properties
interface TypeFunction {
  (type?: string): string;
  currentType: string;
}

export function isBadVideo(file: FileData) {
  const duration = file['14'] ?? '';
  const title = getPostTitle(file);

  logger.debug(`Checking if video is bad: "${title}" (duration: ${duration}, type: ${file.type})`);

  // Check each condition and log the reason if it fails
  if (duration.match(/^\d+s/)) {
    logger.debug(`Bad video: "${title}": Duration too short (${duration})`);
    return true;
  }
  if (duration.match('^[0-5]m')) {
    logger.debug(`Bad video: "${title}": Duration too short (${duration})`);
    return true;
  }
  if (file.passwd) {
    logger.debug(`Bad video: "${title}": Password protected`);
    return true;
  }
  if (file.virus) {
    logger.debug(`Bad video: "${title}": Contains virus`);
    return true;
  }
  if (file.type.toUpperCase() !== 'VIDEO') {
    logger.debug(`Bad video: "${title}": Not a video file (type: ${file.type})`);
    return true;
  }
  if (file.rawSize && file.rawSize < 20 * 1024 * 1024) {
    logger.debug(
      `Bad video: "${title}": File too small (${Math.round(file.rawSize / 1024 / 1024)}MB)`
    );
    return true;
  }

  logger.debug(`Video passed quality checks: "${title}"`);
  return false;
}

/**
 * Sanitize a title for case-insensitive comparison.
 * Handles special characters, accented letters, and common separators.
 */
export function sanitizeTitle(title: string) {
  logger.debug(`Sanitizing title: "${title}"`);
  const result = title
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
    .trim();
  logger.debug(`Sanitized result: "${result}"`);
  return result;
}

/**
 * Improved title matching with more accurate results
 * @param title The content title to check
 * @param query The search query to match against
 * @param strict Whether to perform exact matching (for movies)
 * @returns Whether the title matches the query
 */
export function matchesTitle(title: string, query: string, strict: boolean) {
  logger.debug(`Matching title: "${title}" against query: "${query}" (strict: ${strict})`);

  const sanitizedQuery = sanitizeTitle(query);
  const sanitizedTitle = sanitizeTitle(title);

  // Extract the main title part for comparison (excluding episode info)
  const mainQueryPart = sanitizedQuery.split(/s\d+e\d+/i)[0].trim();
  const isSeriesQuery = /s\d+e\d+/i.test(sanitizedQuery);
  logger.debug(`Main query part: "${mainQueryPart}", is series query: ${isSeriesQuery}`);

  // For strict mode, we require an exact title match or proper prefix match
  if (strict) {
    // For series with season/episode pattern like S01E01
    const seasonEpisodePattern = /s\d+e\d+/i;
    const hasSeasonEpisodePattern = seasonEpisodePattern.test(sanitizedQuery);
    logger.debug(`Strict mode - has season/episode pattern: ${hasSeasonEpisodePattern}`);

    if (hasSeasonEpisodePattern) {
      // 1. Check if the title STARTS with the main part of the query (not just contains it)
      // This catches cases like "the.state.s01e01" but excludes "how.the.states.got.their.shapes.s01e01"
      if (!sanitizedTitle.startsWith(mainQueryPart)) {
        logger.debug(`Strict mode - title doesn't start with main query part, rejecting`);
        return false;
      }

      // 2. Make sure the title contains the season/episode pattern
      const seMatch = sanitizedQuery.match(seasonEpisodePattern);
      if (seMatch && seMatch[0]) {
        const pattern = seMatch[0].toLowerCase();
        const result = sanitizedTitle.includes(pattern);
        logger.debug(`Strict mode - checking for pattern "${pattern}" in title: ${result}`);
        return result;
      }
    }

    // For movies or other non-series content
    const { title: parsedTitle, year } = parseTorrentTitle(title);
    logger.debug(`Strict mode - parsed title: "${parsedTitle}", year: ${year}`);

    if (parsedTitle) {
      const sanitizedParsedTitle = sanitizeTitle(parsedTitle);

      // Check for exact match, or match with year
      if (sanitizedParsedTitle === sanitizedQuery) {
        logger.debug(`Strict mode - exact match found`);
        return true;
      }

      // If query has a year and parsed title has a year, both must match
      const queryYearMatch = sanitizedQuery.match(/\b(\d{4})\b/);
      if (queryYearMatch && year) {
        const queryYear = queryYearMatch[1];
        const result =
          sanitizedParsedTitle.replace(queryYear, '').trim() ===
            sanitizedQuery.replace(queryYear, '').trim() && year.toString() === queryYear;
        logger.debug(`Strict mode - matching with year ${queryYear}: ${result}`);
        return result;
      }
    }

    // If we're in strict mode and haven't matched by now, return false
    logger.debug(`Strict mode - no match found`);
    return false;
  }

  // Non-strict mode below (original behavior)
  logger.debug(`Non-strict mode matching`);

  // For series with season/episode pattern like S01E01
  const seasonEpisodePattern = /s\d+e\d+/i;
  const hasSeasonEpisodePattern = seasonEpisodePattern.test(sanitizedQuery);

  if (hasSeasonEpisodePattern) {
    // Extract season/episode pattern
    const seMatch = sanitizedQuery.match(seasonEpisodePattern);
    if (seMatch && seMatch[0]) {
      const pattern = seMatch[0].toLowerCase();
      const result = sanitizedTitle.includes(pattern);
      logger.debug(`Non-strict mode - checking for pattern "${pattern}" in title: ${result}`);
      return result;
    }
  }

  // Check that all words in the query appear in the title
  const queryWords = sanitizedQuery.split(/\s+/);
  const allWordsMatch = queryWords.every(word => {
    // Skip very short words (1-2 chars) to avoid false positives
    if (word.length <= 2) return true;
    return sanitizedTitle.includes(word);
  });
  logger.debug(`Non-strict mode - all words match: ${allWordsMatch}`);

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
      logger.debug(
        `Non-strict mode - match ratio: ${matchRatio.toFixed(2)} (${matchingWords}/${significantWords})`
      );
      return matchRatio >= 0.7;
    }
  }

  logger.debug(`Non-strict mode final result: ${allWordsMatch}`);
  return allWordsMatch;
}

export function createStreamUrl(
  { downURL, dlFarm, dlPort }: Pick<EasynewsSearchResponse, 'downURL' | 'dlFarm' | 'dlPort'>,
  username: string,
  password: string
) {
  logger.debug(`Creating stream URL with farm: ${dlFarm}, port: ${dlPort}`);
  // For streaming, we can still use the username:password@ format in the URL
  // as it will be handled by media players, not the fetch API
  const url = `${downURL.replace('https://', `https://${username}:${password}@`)}/${dlFarm}/${dlPort}`;
  logger.debug(
    `Stream URL created: ${url.substring(0, url.indexOf('@') + 1)}***/${dlFarm}/${dlPort}`
  );
  return url;
}

export function createStreamPath(file: FileData) {
  const postHash = file['0'] ?? '';
  const postTitle = file['10'] ?? '';
  const ext = file['11'] ?? '';

  const path = `${postHash}${ext}/${postTitle}${ext}`;
  logger.debug(`Created stream path: ${path.substring(0, 50)}${path.length > 50 ? '...' : ''}`);
  return path;
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
  logger.debug(`Getting quality for: "${title}", fallback: ${fallbackResolution}`);
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
        logger.debug(`Quality found by pattern: ${quality}`);
        return quality;
      }
    }
  }

  // Return resolution found by parser
  if (resolution) {
    // Map common resolution formats to standard quality names
    if (resolution === '2160p' || resolution.includes('4k') || resolution.includes('4K')) {
      logger.debug(`Quality found by parser: 4K`);
      return '4K';
    }
    logger.debug(`Quality found by parser: ${resolution}`);
    return resolution;
  }

  // Use fallback if provided
  if (fallbackResolution) {
    logger.debug(`Using fallback quality: ${fallbackResolution}`);
    return fallbackResolution;
  }

  logger.debug(`No quality found`);
  return undefined;
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
  logger.debug(`Getting alternative titles for: "${title}"`);

  // Start with an empty array
  const alternatives: string[] = [title];

  // Check direct match first
  if (customTitlesInput[title]) {
    logger.debug(`Found direct match in custom titles for: "${title}"`);
    alternatives.push(...customTitlesInput[title]);
  }

  // Then check partial matches
  for (const [key, values] of Object.entries(customTitlesInput)) {
    // Skip direct matches that we've already handled
    if (key === title) continue;

    // Check if either string contains the other
    if (
      title.toLowerCase().includes(key.toLowerCase()) ||
      key.toLowerCase().includes(title.toLowerCase())
    ) {
      logger.debug(`Found partial match between "${title}" and "${key}"`);

      // Check if any of these alternatives are already in our list
      const newValues = values.filter(v => !alternatives.includes(v));
      if (newValues.length > 0) {
        logger.debug(
          `Adding ${newValues.length} new alternatives from partial match: ${newValues.join(', ')}`
        );
        alternatives.push(...newValues);
      }
    }
  }

  if (alternatives.length > 1) {
    logger.debug(`Found ${alternatives.length - 1} alternative titles for "${title}"`);
  } else {
    logger.debug(`No alternative titles found for "${title}"`);
  }

  return alternatives;
}

/**
 * Build a search query for different content types
 */
export function buildSearchQuery(type: ContentType, meta: MetaProviderResponse) {
  logger.debug(`Building search query for ${type}: ${meta.name} (year: ${meta.year || 'none'})`);

  let query = '';

  // Build advanced query with specific formats based on content type
  switch (type) {
    case 'movie':
      // For movies, we can search directly by name (and year if available)
      query = meta.year ? `${meta.name} ${meta.year}` : meta.name;
      break;
    case 'series':
      // For series, we need to include the season and episode
      if (meta.episode && meta.season) {
        // Format: Name S01E01
        query = `${meta.name} S${meta.season.toString().padStart(2, '0')}E${meta.episode
          .toString()
          .padStart(2, '0')}`;
      } else {
        // Just the name as fallback
        query = meta.name;
      }
      break;
    default:
      // Default to just the name
      query = meta.name;
  }

  logger.debug(`Final search query: ${query}`);
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
 * Format a timestamp for logging
 * @returns Formatted timestamp [HH:MM:SS]
 */
function getTimestamp(): string {
  const now = new Date();
  return `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
}

/**
 * Simple logger implementation for Cloudflare environment
 */
class CloudflareLogger {
  level: string;

  constructor(level: string = 'info') {
    this.level = level.toLowerCase();
  }

  private shouldLog(level: string): boolean {
    const levels = { error: 0, warn: 1, info: 2, debug: 3, silly: 4 };
    return (
      levels[level as keyof typeof levels] <= levels[this.level as keyof typeof levels] || false
    );
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    let formattedMessage = `[v${getVersion()}] ${level.toUpperCase()}: ${message}`;

    if (args.length > 0) {
      const formattedArgs = args
        .map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg))
        .join(' ');
      formattedMessage = `${formattedMessage} ${formattedArgs}`;
    }

    return formattedMessage;
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, ...args));
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, ...args));
    }
  }

  silly(message: string, ...args: any[]): void {
    if (this.shouldLog('silly')) {
      console.log(this.formatMessage('silly', message, ...args));
    }
  }
}

/**
 * Logger using Winston directly or simple console logger for Cloudflare
 *
 * Log levels can be set via environment variable: EASYNEWS_LOG_LEVEL
 * Valid values: error, warn, info, debug, silly, or silent
 */
// Create and export the appropriate logger
export const logger = (() => {
  const logLevel = process.env.EASYNEWS_LOG_LEVEL?.toLowerCase() || 'info';

  // Use simple logger for Cloudflare environment
  if (process.env.CLOUDFLARE === 'true') {
    return new CloudflareLogger(logLevel);
  }

  // Use Winston for all other environments
  return winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(info => {
        // Handle multiple arguments passed to the logger
        const splat = info[Symbol.for('splat')] || [];
        let message = info.message;

        // If there are additional arguments, format them and add to the message
        if (splat && Array.isArray(splat) && splat.length > 0) {
          const args = splat
            .map((arg: any) => (typeof arg === 'object' ? JSON.stringify(arg) : arg))
            .join(' ');
          message = `${message} ${args}`;
        }

        return `[v${getVersion()}] ${info.level}: ${message}`;
      })
    ),
    transports: [new winston.transports.Console()],
  });
})();

export function logError(message: { message: string; error: unknown; context: unknown }) {
  logger.error(`Error: ${message.message}`, message);
}

export function capitalizeFirstLetter(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
