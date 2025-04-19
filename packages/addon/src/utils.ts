import { EasynewsSearchResponse, FileData } from '@easynews-plus-plus/api';
import { MetaProviderResponse } from './meta';
import { ContentType } from 'stremio-addon-sdk';
import { parse as parseTorrentTitle } from 'parse-torrent-title';

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

  // For strict mode (typically movies), we try to extract the exact title
  if (strict) {
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
            sanitizedQuery.replace(queryYear, '').trim() &&
          year.toString() === queryYear
        );
      }
    }
  }

  // For TV shows and less strict matching
  const sanitizedTitle = sanitizeTitle(title);

  // Check for word boundary match to avoid partial word matches
  const queryWords = sanitizedQuery.split(/\s+/);

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
  const allWordsMatch = queryWords.every((word) => {
    // Skip very short words (1-2 chars) to avoid false positives
    if (word.length <= 2) return true;
    return sanitizedTitle.includes(word);
  });

  // For multiple word queries, ensure the title contains the full phrase
  // or at least a high percentage of matching words
  if (queryWords.length > 1 && !strict) {
    // Count matching words
    const matchingWords = queryWords.filter(
      (word) => word.length > 2 && sanitizedTitle.includes(word)
    ).length;

    // If more than 70% of significant words match, consider it a match
    const significantWords = queryWords.filter(
      (word) => word.length > 2
    ).length;
    if (significantWords > 0) {
      const matchRatio = matchingWords / significantWords;
      return matchRatio >= 0.7;
    }
  }

  return allWordsMatch;
}

export function createStreamUrl(
  {
    downURL,
    dlFarm,
    dlPort,
  }: Pick<EasynewsSearchResponse, 'downURL' | 'dlFarm' | 'dlPort'>,
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
export function getQuality(
  title: string,
  fallbackResolution?: string
): string | undefined {
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

export function createThumbnailUrl(
  res: EasynewsSearchResponse,
  file: FileData
) {
  const id = file['0'];
  const idChars = id.slice(0, 3);
  const thumbnailSlug = file['10'];
  return `${res.thumbURL}${idChars}/pr-${id}.jpg/th-${thumbnailSlug}.jpg`;
}

export function extractDigits(value: string) {
  const match = value.match(/\d+/);

  if (match) {
    return parseInt(match[0], 10);
  }

  return undefined;
}

/**
 * Build a search query for different content types
 */
export function buildSearchQuery(
  type: ContentType,
  meta: MetaProviderResponse
) {
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

export function logError(message: {
  message: string;
  error: unknown;
  context: unknown;
}) {
  console.error(message);
}

export function capitalizeFirstLetter(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
