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

  return false;
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
