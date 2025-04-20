import { Cache, ContentType, MetaDetail, MetaVideo } from 'stremio-addon-sdk';
import addonBuilder from 'stremio-addon-sdk/src/builder';
import landingTemplate from 'stremio-addon-sdk/src/landingTemplate';
import { catalog, manifest } from './manifest';
import {
  buildSearchQuery,
  capitalizeFirstLetter,
  createStreamPath,
  createStreamUrl,
  createThumbnailUrl,
  getDuration,
  getFileExtension,
  getPostTitle,
  getQuality,
  getSize,
  getVersion,
  isBadVideo,
  loadTitleTranslations,
  logger,
  LogLevel,
  logError,
  matchesTitle,
  parseCustomTitles,
  getAlternativeTitles,
} from './utils';
import {
  EasynewsAPI,
  SearchOptions,
  EasynewsSearchResponse,
} from '@easynews-plus-plus/api';
import { publicMetaProvider } from './meta';
import {
  fromHumanReadable,
  toDirection,
  SortOption,
  SortOptionKey,
} from './sort-option';
import { Stream } from './types';
import * as path from 'path';
import * as fs from 'fs';

// Extended configuration interface
interface AddonConfig {
  username: string;
  password: string;
  customTitles?: string;
  strictTitleMatching?: string;
  sort1?: string;
  sort1Direction?: string;
  sort2?: string;
  sort2Direction?: string;
  sort3?: string;
  sort3Direction?: string;
  logLevel?: string; // Add log level configuration option
  [key: string]: any;
}

// Definiere ValidPosterShape als Workaround für fehlendes PosterShape-Type
type ValidPosterShape = 'square' | 'regular' | 'landscape';

const builder = new addonBuilder(manifest);
const prefix = `${catalog.id}:`;

// Log addon initialization
logger.info(
  `Addon initializing - version: ${getVersion()}, log level: ${logger.getLevelName()}`
);

// In-memory request cache to reduce API calls and improve response times
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

function getFromCache<T>(key: string): T | null {
  const cached = requestCache.get(key);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    requestCache.delete(key);
    return null;
  }

  return cached.data as T;
}

function setCache<T>(key: string, data: T): void {
  requestCache.set(key, { data, timestamp: Date.now() });
}

// Load custom title translations from file if available
// Try multiple possible locations for the file
let translationsFromFile: Record<string, string[]> = {};
let loadedPath: string | null = null;

// Start with the built-in translations by calling loadTitleTranslations with a non-existent path
// This will return the default built-in translations
translationsFromFile = loadTitleTranslations('');

try {
  const possiblePaths = [
    // In the same directory as the running code
    path.join(__dirname, 'title-translations.json'),
    // One level up (addon root directory)
    path.join(__dirname, '..', 'title-translations.json'),
    // Two levels up (packages directory)
    path.join(__dirname, '..', '..', 'title-translations.json'),
    // Three levels up (project root)
    path.join(__dirname, '..', '..', '..', 'title-translations.json'),
    // In current working directory
    path.join(process.cwd(), 'title-translations.json'),
    // In addon subdirectory of current working directory
    path.join(process.cwd(), 'addon', 'title-translations.json'),
    // In dist subdirectory of current working directory
    path.join(process.cwd(), 'dist', 'title-translations.json'),
  ];

  // Try each path until we find the file
  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        logger.info(`Found title-translations.json at: ${filePath}`);
        translationsFromFile = loadTitleTranslations(filePath);
        loadedPath = filePath;

        // Log some details about the loaded translations
        const numTranslations = Object.keys(translationsFromFile).length;
        logger.info(
          `Successfully loaded ${numTranslations} title translations`
        );

        if (numTranslations > 0) {
          // Log a few examples to verify they're loaded correctly
          const examples = Object.entries(translationsFromFile).slice(0, 3);
          for (const [original, translations] of examples) {
            logger.info(
              `Example translation: "${original}" -> "${translations.join('", "')}"`
            );
          }
        } else {
          logger.info(
            'No translations were loaded from the file. The file might be empty or have invalid format.'
          );
        }
        break;
      }
    } catch (error) {
      logger.info(`Error checking path ${filePath}: ${error}`);
    }
  }

  if (!loadedPath) {
    logger.info(
      `Could not find title-translations.json file. Using built-in translations only. Built-in translations count: ${Object.keys(translationsFromFile).length}`
    );
    logger.info('Some examples of built-in translations:');
    const examples = Object.entries(translationsFromFile).slice(0, 5);
    for (const [original, translations] of examples) {
      logger.info(`  "${original}" -> "${translations.join('", "')}"`);
    }
  } else {
    logger.info(`Using title translations from: ${loadedPath}`);
  }
} catch (error) {
  logger.error('Error loading title translations file:', error);
  logger.info('Using built-in translations as fallback');
}

builder.defineCatalogHandler(async ({ extra: { search } }) => {
  return {
    metas: [
      {
        id: `${prefix}${encodeURIComponent(search)}`,
        name: search,
        type: 'tv',
        logo: manifest.logo,
        background: manifest.background,
        posterShape: 'square',
        poster: manifest.logo,
        description: `Provides search results from Easynews for '${search}'`,
      },
    ],
    cacheMaxAge: 3600 * 24 * 30, // The returned data is static so it may be cached for a long time (30 days).
  };
});

builder.defineMetaHandler(
  async ({
    id,
    type,
    config,
  }: {
    id: string;
    type: ContentType;
    config: AddonConfig;
  }) => {
    const { username, password, logLevel } = config;

    // Configure logger based on config
    if (logLevel) {
      logger.setLevel(logLevel);
    }

    if (!id.startsWith(catalog.id)) {
      return { meta: null as unknown as MetaDetail };
    }

    // Make sure credentials are provided
    if (!username || !password) {
      logError({
        message: 'Missing credentials',
        error: new Error('Username and password are required'),
        context: { resource: 'meta', id, type },
      });
      return { meta: null as unknown as MetaDetail };
    }

    try {
      const search = decodeURIComponent(id.replace(prefix, ''));

      // Check cache for this search
      const cacheKey = `meta:${search}:${username}`;
      const cachedResult = getFromCache<{ meta: MetaDetail } & Cache>(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      const videos: MetaVideo[] = [];

      const api = new EasynewsAPI({ username, password });
      const res = await api.searchAll({
        query: search,
        maxResults: 50, // Limit results directly from the API
      });

      for (const file of res?.data ?? []) {
        const title = getPostTitle(file);

        if (isBadVideo(file) || !matchesTitle(title, search, false)) {
          continue;
        }

        videos.push({
          id: `${prefix}${file.sig}`,
          released: new Date(file['5']).toISOString(),
          title,
          overview: file['6'],
          thumbnail: createThumbnailUrl(res, file),
          streams: [
            mapStream({
              username,
              password,
              title,
              fullResolution: file.fullres,
              fileExtension: getFileExtension(file),
              duration: getDuration(file),
              size: getSize(file),
              url: `${createStreamUrl(res, username, password)}/${createStreamPath(file)}`,
              videoSize: file.rawSize,
            }),
          ],
        });
      }

      const result = {
        meta: {
          id,
          name: search,
          type: 'tv' as ContentType,
          logo: manifest.logo,
          background: manifest.background,
          poster: manifest.logo,
          posterShape: 'square' as ValidPosterShape,
          description: `Provides search results from Easynews for '${search}'`,
          videos,
        },
        ...getCacheOptions(videos.length),
      };

      // Cache the result
      setCache(cacheKey, result);

      return result;
    } catch (error) {
      logError({
        message: 'failed to handle meta',
        error,
        context: { resource: 'meta', id, type },
      });
      return { meta: null as unknown as MetaDetail };
    }
  }
);

builder.defineStreamHandler(
  async ({
    id,
    type,
    config,
  }: {
    id: string;
    type: ContentType;
    config: AddonConfig;
  }) => {
    const {
      username,
      password,
      customTitles,
      strictTitleMatching,
      logLevel,
      ...options
    } = config;

    // Configure logger based on config
    if (logLevel) {
      logger.setLevel(logLevel);
    }

    if (!id.startsWith('tt')) {
      return {
        streams: [],
      };
    }

    // Include strictTitleMatching setting in cache key to ensure
    // users with different settings get different cache results
    const cacheKey = `${id}:strict=${strictTitleMatching === 'on' || strictTitleMatching === 'true'}`;
    const cached = getFromCache<{ streams: Stream[] }>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      if (!username || !password) {
        throw new Error('Missing username or password');
      }

      // Parse strictTitleMatching option (checkbox returns string 'on' or undefined)
      const useStrictMatching =
        strictTitleMatching === 'on' || strictTitleMatching === 'true';
      logger.info(
        `Strict title matching: ${useStrictMatching ? 'enabled' : 'disabled'}`
      );

      // Combine config-provided custom titles with titles from file
      let titleTranslations = { ...translationsFromFile };

      logger.info(
        `Using ${Object.keys(titleTranslations).length} title translations (${Object.keys(translationsFromFile).length} from built-in/file + additional from config)`
      );

      // Add any custom titles from configuration
      if (customTitles) {
        logger.info(`Additional custom titles provided in configuration`);
        const customTitlesObj = parseCustomTitles(customTitles);
        const customCount = Object.keys(customTitlesObj).length;
        logger.info(`Parsed ${customCount} custom titles from configuration`);

        if (customCount > 0) {
          // Merge translations, custom titles take precedence
          titleTranslations = {
            ...translationsFromFile,
            ...customTitlesObj,
          };
          logger.info(
            `Combined title translations count: ${Object.keys(titleTranslations).length}`
          );
        }
      }

      // sort options
      const sortOptions: Partial<SearchOptions> = {
        query: '', // Will be set for each search later
      };

      // Process sort options
      const sort1 = options.sort1 as string | undefined;
      if (sort1) {
        const sortValue = fromHumanReadable(sort1);
        if (sortValue) {
          sortOptions.sort1 = sortValue;
        }
      }

      const sort1Direction = options.sort1Direction as string | undefined;
      if (sort1Direction) {
        sortOptions.sort1Direction = toDirection(sort1Direction);
      }

      const meta = await publicMetaProvider(id, type);
      logger.info(`Searching for: ${meta.name}`);

      // Check if we have a translation for this title directly
      if (titleTranslations[meta.name]) {
        logger.info(
          `Direct translation found for "${meta.name}": "${titleTranslations[meta.name].join('", "')}"`
        );
      } else {
        logger.info(
          `No direct translation found for "${meta.name}", checking partial matches`
        );

        // Look for partial matches in title keys
        for (const [key, values] of Object.entries(titleTranslations)) {
          if (
            meta.name.toLowerCase().includes(key.toLowerCase()) ||
            key.toLowerCase().includes(meta.name.toLowerCase())
          ) {
            logger.info(
              `Possible title match: "${meta.name}" ~ "${key}" -> "${values.join('", "')}"`
            );
          }
        }
      }

      const api = new EasynewsAPI({ username, password });

      // Use alternativeNames from metadata if available, or generate them
      // Convert translations to JSON string for getAlternativeTitles
      const titlesJson = JSON.stringify(titleTranslations);

      logger.info(`Getting alternative titles for: ${meta.name}`);

      // Initialize with the original title
      let allTitles = [meta.name];

      // Add any direct translations found in titleTranslations
      if (
        titleTranslations[meta.name] &&
        titleTranslations[meta.name].length > 0
      ) {
        logger.info(
          `Adding direct translations for "${meta.name}": "${titleTranslations[meta.name].join('", "')}"`
        );
        allTitles = [...allTitles, ...titleTranslations[meta.name]];
      }

      // Add any alternative names from meta (if available)
      if (meta.alternativeNames && meta.alternativeNames.length > 0) {
        logger.info(
          `Adding ${meta.alternativeNames.length} alternative names from metadata`
        );
        // Filter out duplicates
        const newAlternatives = meta.alternativeNames.filter(
          (alt) => !allTitles.includes(alt)
        );
        allTitles = [...allTitles, ...newAlternatives];
      }

      // Use getAlternativeTitles to find additional matches (like partial matches)
      const additionalTitles = getAlternativeTitles(
        meta.name,
        titlesJson
      ).filter((alt) => !allTitles.includes(alt) && alt !== meta.name);

      if (additionalTitles.length > 0) {
        logger.info(
          `Adding ${additionalTitles.length} additional titles from partial matches`
        );
        allTitles = [...allTitles, ...additionalTitles];
      }

      logger.info(
        `Will search for ${allTitles.length} titles: ${allTitles.join(', ')}`
      );

      // Store all search results here
      const allSearchResults: {
        query: string;
        result: EasynewsSearchResponse;
      }[] = [];

      // First try without year for each title variant
      for (const titleVariant of allTitles) {
        // Skip empty titles
        if (!titleVariant.trim()) continue;

        const titleMeta = { ...meta, name: titleVariant, year: undefined };
        const query = buildSearchQuery(type, titleMeta);
        logger.info(`Searching without year for: "${query}"`);

        try {
          const res = await api.search({
            ...sortOptions,
            query,
            maxResults: 50, // Limit results directly from the API
          });

          const resultCount = res?.data?.length || 0;
          logger.info(`Found ${resultCount} results for "${query}"`);

          if (resultCount > 0) {
            allSearchResults.push({ query, result: res });

            // Log a few examples of the results
            const examples = res.data.slice(0, 2);
            for (const file of examples) {
              const title = getPostTitle(file);
              logger.info(
                `Example result: "${title}" (${file['4'] || 'unknown size'})`
              );
            }
          }
        } catch (error) {
          logger.error(`Error searching for "${query}":`, error);
          // Continue with other titles even if one fails
        }
      }

      // If we get no or few results, try with year included for more specificity
      if (allSearchResults.length === 0 && meta.year !== undefined) {
        logger.info(
          `No results found without year, trying with year: ${meta.year}`
        );

        for (const titleVariant of allTitles) {
          // Skip empty titles
          if (!titleVariant.trim()) continue;

          const titleMeta = { ...meta, name: titleVariant, year: meta.year };
          const query = buildSearchQuery(type, titleMeta);
          logger.info(`Searching with year for: "${query}"`);

          try {
            const res = await api.search({
              ...sortOptions,
              query,
              maxResults: 50, // Limit results directly from the API
            });

            const resultCount = res?.data?.length || 0;
            logger.info(`Found ${resultCount} results for "${query}"`);

            if (resultCount > 0) {
              allSearchResults.push({ query, result: res });

              // Log a few examples of the results
              const examples = res.data.slice(0, 2);
              for (const file of examples) {
                const title = getPostTitle(file);
                logger.info(
                  `Example result: "${title}" (${file['4'] || 'unknown size'})`
                );
              }
            }
          } catch (error) {
            logger.error(`Error searching for "${query}":`, error);
            // Continue with other titles even if one fails
          }
        }
      }

      if (allSearchResults.length === 0) {
        return { streams: [] };
      }

      const streams: Stream[] = [];
      const processedHashes = new Set<string>(); // To avoid duplicate files

      // Process all search results
      for (const { query, result: res } of allSearchResults) {
        for (const file of res.data ?? []) {
          const title = getPostTitle(file);
          const fileHash = file['0']; // Use file hash to detect duplicates

          if (isBadVideo(file) || processedHashes.has(fileHash)) {
            continue;
          }

          processedHashes.add(fileHash);

          // For series there are multiple possible queries that could match the title.
          // We check if at least one of them matches.
          if (type === 'series') {
            // Create queries for all title variants
            const queries: string[] = [];

            for (const titleVariant of allTitles) {
              // Add full query with season and episode
              const fullMeta = {
                ...meta,
                name: titleVariant,
                year: meta.year,
              };
              queries.push(buildSearchQuery(type, fullMeta));

              // Add query with episode only
              const episodeMeta = {
                name: titleVariant,
                episode: meta.episode,
              };
              queries.push(buildSearchQuery(type, episodeMeta));
            }

            // Use strictTitleMatching setting if enabled for series
            if (
              !queries.some((q) => matchesTitle(title, q, useStrictMatching))
            ) {
              continue;
            }
          }

          // For movies, check if title matches any of the query variants
          // Other content types are loosely matched
          const matchesAnyVariant = allTitles.some((titleVariant) => {
            const variantQuery = buildSearchQuery(type, {
              ...meta,
              name: titleVariant,
            });
            // For movies, always use strictTitleMatching if enabled, otherwise default to movie behavior
            return matchesTitle(
              title,
              variantQuery,
              type === 'movie' || useStrictMatching
            );
          });

          if (!matchesAnyVariant) {
            continue;
          }

          streams.push(
            mapStream({
              username,
              password,
              fullResolution: file.fullres,
              fileExtension: getFileExtension(file),
              duration: getDuration(file),
              size: getSize(file),
              title,
              url: `${createStreamUrl(res, username, password)}/${createStreamPath(file)}`,
              videoSize: file.rawSize,
            })
          );
        }
      }

      // Sort streams - prioritize higher quality videos
      streams.sort((a, b) => {
        // Extract description lines which contain size information
        const aDesc = a.description?.split('\n') || [];
        const bDesc = b.description?.split('\n') || [];

        // Extract quality from name
        const aQuality = a.name?.includes('\n') ? a.name.split('\n')[1] : '';
        const bQuality = b.name?.includes('\n') ? b.name.split('\n')[1] : '';

        // Get quality scores (higher = better quality)
        const getQualityScore = (quality: string): number => {
          if (
            quality?.includes('4K') ||
            quality?.includes('2160p') ||
            quality?.includes('UHD')
          )
            return 4;
          if (quality?.includes('1080p')) return 3;
          if (quality?.includes('720p')) return 2;
          if (quality?.includes('480p')) return 1;
          return 0; // unknown quality
        };

        const aScore = getQualityScore(aQuality);
        const bScore = getQualityScore(bQuality);

        // Higher score should come first
        if (aScore !== bScore) {
          return bScore - aScore; // Reverse order so higher score comes first
        }

        // If same quality, prioritize by file size (larger typically better quality)
        const aSize = aDesc.length > 2 ? aDesc[2] : '';
        const bSize = bDesc.length > 2 ? bDesc[2] : '';

        // Simple size comparison for GB files
        if (aSize.includes('GB') && bSize.includes('GB')) {
          const aGB = parseFloat(aSize.match(/[\d.]+/)?.[0] || '0');
          const bGB = parseFloat(bSize.match(/[\d.]+/)?.[0] || '0');
          if (aGB > bGB) return -1;
          if (aGB < bGB) return 1;
        }

        // Compare MB to GB (GB is always larger)
        if (aSize.includes('GB') && bSize.includes('MB')) return -1;
        if (aSize.includes('MB') && bSize.includes('GB')) return 1;

        // Compare MB files
        if (aSize.includes('MB') && bSize.includes('MB')) {
          const aMB = parseFloat(aSize.match(/[\d.]+/)?.[0] || '0');
          const bMB = parseFloat(bSize.match(/[\d.]+/)?.[0] || '0');
          if (aMB > bMB) return -1;
          if (aMB < bMB) return 1;
        }

        return 0;
      });

      // Limit to top 25 streams to prevent overwhelming the player
      // No need to slice here since we're already limiting results at the API level
      const result = {
        streams,
        ...getCacheOptions(streams.length),
      };

      // Cache the result
      setCache(cacheKey, result);

      return result;
    } catch (error) {
      logError({
        message: 'failed to handle stream',
        error,
        context: { resource: 'stream', id, type },
      });
      return { streams: [] };
    }
  }
);

function mapStream({
  username,
  password,
  duration,
  size,
  fullResolution,
  title,
  fileExtension,
  videoSize,
  url,
}: {
  title: string;
  url: string;
  username: string;
  password: string;
  fileExtension: string;
  videoSize: number | undefined;
  duration: string | undefined;
  size: string | undefined;
  fullResolution: string | undefined;
}): Stream {
  const quality = getQuality(title, fullResolution);

  return {
    name: `Easynews++${quality ? `\n${quality}` : ''}`,
    description: [
      `${title}${fileExtension}`,
      `🕛 ${duration ?? 'unknown duration'}`,
      `📦 ${size ?? 'unknown size'}`,
    ].join('\n'),
    url: url,
    behaviorHints: {
      notWebReady: true,
      filename: `${title}${fileExtension}`,
    },
  };
}

function getCacheOptions(itemsLength: number): Partial<Cache> {
  return {
    cacheMaxAge: (Math.min(itemsLength, 10) / 10) * 3600 * 24 * 7, // up to 1 week of cache for items
  };
}

export const addonInterface = builder.getInterface();
export const landingHTML = landingTemplate(addonInterface.manifest);
