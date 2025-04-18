import { EasynewsSearchResponse, FileData } from '@easynews/api';
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
    file.type.toUpperCase() !== 'VIDEO'
  );
}

export function sanitizeTitle(title: string) {
  return (
    title
      // replace common symbols with words
      .replaceAll('&', 'and')
      // replace common separators (., _, -, whitespace) with a single space
      .replace(/[\.\-_:\s]+/g, ' ')
      // remove non-alphanumeric characters except for accented characters
      .replace(/[^\w\sÀ-ÿ]/g, '')
      // to lowercase + remove spaces at the beginning and end
      .toLowerCase()
      .trim()
  );
}

export function matchesTitle(title: string, query: string, strict: boolean) {
  const sanitizedQuery = sanitizeTitle(query);

  if (strict) {
    const { title: movieTitle } = parseTorrentTitle(title);
    if (movieTitle) {
      return sanitizeTitle(movieTitle) === sanitizedQuery;
    }
  }

  const sanitizedTitle = sanitizeTitle(title);
  const re = new RegExp(`\\b${sanitizedQuery}\\b`, 'i'); // match the whole word; e.g. query "deadpool 2" shouldn't match "deadpool 2016"
  return re.test(sanitizedTitle);
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

export function getQuality(
  title: string,
  fallbackResolution?: string
): string | undefined {
  const { resolution } = parseTorrentTitle(title);
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
