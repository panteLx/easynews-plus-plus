import { EasynewsSearchResponse, FileData } from 'easynews-plus-plus-api';
import { MetaProviderResponse } from './meta';
import { ContentType } from 'stremio-addon-sdk';
import { parse as parseTorrentTitle } from 'parse-torrent-title';
import path from 'path';
import dotenv from 'dotenv';
import { createLogger } from 'easynews-plus-plus-shared';

// Import the custom titles JSON directly
import customTitlesJson from '../../../custom-titles.json';

// Load .env file to ensure we have all environment variables
function loadEnv() {
  // Skip .env loading for Cloudflare Workers environment
  if (process.env.CLOUDFLARE === 'true') {
    // We can't use logger here since it's not initialized yet
    console.log('Cloudflare environment detected, skipping .env file loading');
    return;
  }

  try {
    // Load environment variables from env file in project root
    const configPath = path.resolve('../../.env');
    const result = dotenv.config({ path: configPath });

    // Log the result of loading the environment config
    if (result.error) {
      // We can't use logger here since it's not initialized yet
      console.warn('Error loading .env. Continuing with default values.');
    } else {
      // We can't use logger here since it's not initialized yet
      console.log('Environment configuration loaded successfully');
    }
  } catch (error) {
    // We can't use logger here since it's not initialized yet
    console.error('Error while trying to load .env file:', error);
  }
}

// Only load .env in non-Cloudflare environments
if (typeof process !== 'undefined' && !process.env.CLOUDFLARE) {
  loadEnv();
}

// Create a logger with Addon prefix and explicitly set the level from environment variable
export const logger = createLogger({
  prefix: 'Utils',
  level: process.env.EASYNEWS_LOG_LEVEL || undefined, // Use the environment variable if set
});

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
  // logger.debug(`Sanitizing title: "${title}"`);
  const result = title
    // replace common accented characters with their base characters
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/ß/g, 'ss')
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
  // logger.debug(`Sanitized result: "${result}"`);
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
      // Split the title into words to make exact word comparisons
      const titleWords = sanitizedTitle.split(/\s+/);
      const mainQueryWords = mainQueryPart.split(/\s+/);

      // For exact title matching, ensure one of these conditions is true:
      // 1. Title is EXACTLY the query
      // 2. Title is exactly the query plus season/episode info
      // 3. Title starts with the exact query words followed by season/episode info (possibly with year in between)

      // Check if title is exactly the same as the main query part (case 1)
      if (sanitizedTitle === mainQueryPart) {
        logger.debug(`Strict mode - title exactly matches main query part`);
        return true;
      }

      // Check if title contains season/episode pattern
      const seMatch = sanitizedTitle.match(seasonEpisodePattern);
      if (seMatch) {
        const titleBeforeSE = sanitizedTitle.split(seMatch[0])[0].trim();

        // Check if everything before season/episode is exactly the main query (case 2)
        if (titleBeforeSE === mainQueryPart) {
          logger.debug(`Strict mode - title matches main query part + season/episode pattern`);
          return true;
        }

        // Remove year from title before comparing
        const yearPattern = /\b(19\d{2}|20\d{2})\b/;
        const titleWithoutYear = titleBeforeSE.replace(yearPattern, '').trim();

        // If after removing year, the title matches the query exactly
        if (titleWithoutYear === mainQueryPart) {
          logger.debug(`Strict mode - title matches main query part after removing year`);
          return true;
        }

        // If title still has more words than query (after removing year), it's not a match
        // e.g. "grace and frankie s01e01" doesn't match "grace"
        const titleWordsWithoutYear = titleWithoutYear.split(/\s+/);
        if (titleWordsWithoutYear.length > mainQueryWords.length) {
          logger.debug(`Strict mode - title has extra words before season/episode, rejecting`);
          return false;
        }
      } else {
        // No season/episode in title, reject if it doesn't match the main query exactly
        logger.debug(`Strict mode - no season/episode pattern in title, rejecting`);
        return false;
      }

      // Check if main query is fully contained at the start of the title
      // First remove year if present to avoid it interfering with word comparison
      const yearPattern = /\b(19\d{2}|20\d{2})\b/;
      const titleBeforeSE = sanitizedTitle.split(seasonEpisodePattern)[0].trim();
      const titleWithoutYear = titleBeforeSE.replace(yearPattern, '').trim();
      const titleWordsWithoutYear = titleWithoutYear.split(/\s+/);

      const isExactWordMatch = mainQueryWords.every(
        (word, i) => i < titleWordsWithoutYear.length && titleWordsWithoutYear[i] === word
      );

      if (!isExactWordMatch) {
        logger.debug(
          `Strict mode - query words don't match exactly at beginning of title, rejecting`
        );
        return false;
      }

      // If we've reached here, the title matches the query part exactly and has valid season/episode info
      logger.debug(`Strict mode - series title matches criteria`);
      return true;
    }

    // For movies or other non-series content
    const { title: parsedTitle, year } = parseTorrentTitle(title);
    logger.debug(`Strict mode - parsed title: "${parsedTitle}", year: ${year}`);

    if (parsedTitle) {
      const sanitizedParsedTitle = sanitizeTitle(parsedTitle);
      const parsedTitleWords = sanitizedParsedTitle.split(/\s+/);
      const queryWords = sanitizedQuery.split(/\s+/);

      // For movies, only match if:
      // 1. The parsed title is EXACTLY the query
      if (sanitizedParsedTitle === sanitizedQuery) {
        logger.debug(`Strict mode - exact match found`);
        return true;
      }

      // 2. Or if title has a year, check if title without year matches query exactly
      if (year) {
        const titleWithoutYear = sanitizedParsedTitle.replace(year.toString(), '').trim();
        if (titleWithoutYear === sanitizedQuery) {
          logger.debug(`Strict mode - title matches query after removing year`);
          return true;
        }
      }

      // 3. Or if query has a year and title has a year, check if both title and year match
      const queryYearMatch = sanitizedQuery.match(/\b(\d{4})\b/);
      if (queryYearMatch && year) {
        const queryYear = queryYearMatch[1];
        const queryWithoutYear = sanitizedQuery.replace(queryYear, '').trim();
        const titleWithoutYear = sanitizedParsedTitle.replace(year.toString(), '').trim();

        if (queryWithoutYear === titleWithoutYear && year.toString() === queryYear) {
          logger.debug(`Strict mode - title and year match query`);
          return true;
        }
      }

      // 4. Reject if parsed title has more words than query (e.g. "grace and frankie" for "grace")
      // First remove any year from the title
      const yearPattern = /\b(19\d{2}|20\d{2})\b/;
      const parsedTitleWithoutYear = sanitizedParsedTitle.replace(yearPattern, '').trim();
      const parsedTitleWordsWithoutYear = parsedTitleWithoutYear.split(/\s+/);

      if (parsedTitleWordsWithoutYear.length > queryWords.length) {
        logger.debug(`Strict mode - parsed title has extra words (excluding year), rejecting`);
        return false;
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
 * Format a timestamp for logging
 * @returns Formatted timestamp [HH:MM:SS]
 */
function getTimestamp(): string {
  const now = new Date();
  return `[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`;
}

// These methods should remain at the bottom of the file
export function logError(message: { message: string; error: unknown; context: unknown }) {
  logger.error(`Error: ${message.message}`, message);
}

export function capitalizeFirstLetter(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Checks if an error is related to authentication
 * @param err Any error object or string
 * @returns True if the error appears to be authentication-related
 */
export function isAuthError(err: unknown): boolean {
  return /auth|login|username|password|credentials|unauthorized|forbidden/i.test(String(err));
}
