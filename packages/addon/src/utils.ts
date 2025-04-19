import { EasynewsSearchResponse, FileData } from '@easynews-plus-plus/api';
import { MetaProviderResponse } from './meta';
import { ContentType } from 'stremio-addon-sdk';
import { parse as parseTorrentTitle } from 'parse-torrent-title';
import * as fs from 'fs';
import * as path from 'path';

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
 * Default title translations that will be available even when file loading fails (for Cloudflare Workers)
 */
let titleTranslations: Record<string, string[]> = {
  'Rain or Shine': ['Just between Lovers'],
  'Mufasa: The Lion King': ['Mufasa: Der Koenig der Loewen'],
  'The Lion King': ['Der König der Löwen', 'Der Koenig der Loewen'],
  'Avengers: Endgame': ['Avengers: Endspiel'],
  'Avengers: Infinity War': ['Avengers: Infinity Krieg'],
  'Star Wars': ['Krieg der Sterne'],
  'The Godfather': ['Der Pate'],
  'The Dark Knight': ['Der dunkle Ritter'],
  'Pulp Fiction': ['Pulp Fiction'],
  'Fight Club': ['Fight Club', 'Kampfklub'],
  'Forrest Gump': ['Forrest Gump'],
  Inception: ['Inception', 'Anfang'],
  'The Matrix': ['Die Matrix', 'Matrix'],
  'The Lord of the Rings': ['Der Herr der Ringe'],
  'The Shawshank Redemption': ['Die Verurteilten'],
  "Schindler's List": ['Schindlers Liste'],
  'Pirates of the Caribbean': ['Fluch der Karibik'],
  'The Hunger Games': ['Die Tribute von Panem'],
  'Fast and Furious': ['Fast & Furious', 'The Fast and the Furious'],
  'The Avengers': ["Marvel's The Avengers", 'Die Rächer'],
  'Finding Nemo': ['Findet Nemo'],
  'Inside Out': ['Alles steht Kopf'],
  Frozen: ['Die Eiskönigin'],
  Moana: ['Vaiana'],
  'Wreck-It Ralph': ['Ralph reichts'],
  'The Super Mario Bros. Movie': ['Der Super Mario Bros. Film'],
  'The Little Mermaid': ['Arielle, die Meerjungfrau'],
  'Fast X': ['Fast & Furious 10', 'Fast X'],
  'Avatar: The Way of Water': ['Avatar: Der Weg des Wassers'],
  'Walking Dead': ['The Walking Dead'],
  'Money Heist': ['Haus des Geldes', 'La Casa de Papel'],
  'House of the Dragon': ['House of the Dragon', 'Haus des Drachen'],
  'The Mandalorian': ['The Mandalorian', 'Der Mandalorianer'],
  Wednesday: ['Wednesday', 'Addams Family: Wednesday'],
};

/**
 * Load additional title translations from a JSON file if available
 * @param filePath Path to the JSON file containing title translations
 * @returns Title translations from the file or the default translations if file not found
 */
export function loadTitleTranslations(
  filePath: string
): Record<string, string[]> {
  // Check if we're in a Cloudflare Worker environment
  if (
    typeof process === 'undefined' ||
    !process.env ||
    typeof __dirname === 'undefined' ||
    typeof fs === 'undefined'
  ) {
    console.log(
      'Running in Cloudflare Worker environment, using built-in translations only'
    );
    return titleTranslations; // Return the built-in translations
  }

  try {
    if (fs.existsSync(filePath)) {
      console.log(`Loading translations from file: ${filePath}`);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      console.log(`File content length: ${fileContent.length} bytes`);

      // Try to parse the file content
      try {
        const customTranslations = JSON.parse(fileContent);
        console.log(
          `Parsed ${Object.keys(customTranslations).length} custom translations from file`
        );

        // Log a sample of translations for debugging
        const sampleKeys = Object.keys(customTranslations).slice(0, 3);
        for (const key of sampleKeys) {
          console.log(
            `Sample translation: "${key}" -> ${JSON.stringify(customTranslations[key])}`
          );
        }

        // Merge with built-in translations (file translations take precedence)
        return {
          ...titleTranslations,
          ...customTranslations,
        };
      } catch (parseError) {
        console.error(`Error parsing JSON in ${filePath}:`, parseError);
        console.error(
          `First 100 characters of file: ${fileContent.substring(0, 100)}...`
        );
      }
    } else {
      console.log(`File does not exist: ${filePath}`);
    }
  } catch (error) {
    console.log(`Error loading translations from ${filePath}:`, error);
  }

  console.log('Using built-in translations as fallback');
  return titleTranslations; // Return built-in translations as fallback
}

/**
 * Parses custom title translations from a configuration string
 * @param customTitlesStr String from the configuration (JSON format preferred)
 * @returns Record of original titles to arrays of alternative titles
 */
export function parseCustomTitles(
  customTitlesStr: string | any
): Record<string, string[]> {
  // Handle empty/null input
  if (!customTitlesStr) {
    return {};
  }

  // If already an object, process it directly
  if (typeof customTitlesStr === 'object' && !Array.isArray(customTitlesStr)) {
    const result: Record<string, string[]> = {};

    try {
      // Validate the object structure
      for (const [key, value] of Object.entries(customTitlesStr)) {
        if (typeof key === 'string') {
          let valueArray: string[] = [];

          // Handle string value
          if (typeof value === 'string') {
            valueArray = [value.trim()];
          }
          // Handle array value
          else if (Array.isArray(value)) {
            valueArray = (value as any[])
              .filter((item) => typeof item === 'string')
              .map((item) => item.trim())
              .filter((item) => item !== '');
          }

          if (valueArray.length > 0) {
            result[key.trim()] = valueArray;
          }
        }
      }

      return result;
    } catch (objError) {
      console.error('Error processing object custom titles:', objError);
    }
  }

  // Convert to string if needed
  if (typeof customTitlesStr !== 'string') {
    try {
      customTitlesStr = String(customTitlesStr);
    } catch (strError) {
      return {};
    }
  }

  // Trim input
  const trimmedInput = customTitlesStr.trim();

  if (trimmedInput === '') {
    return {};
  }

  const result: Record<string, string[]> = {};
  try {
    // Try to parse as JSON first (preferred)
    if (trimmedInput.startsWith('{') && trimmedInput.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmedInput);

        // Validate the parsed object and its structure
        for (const [key, value] of Object.entries(parsed)) {
          if (typeof key === 'string') {
            let valueArray: string[] = [];

            // Handle string value
            if (typeof value === 'string') {
              valueArray = [value.trim()];
            }
            // Handle array value
            else if (Array.isArray(value)) {
              valueArray = (value as any[])
                .filter((item) => typeof item === 'string')
                .map((item) => item.trim())
                .filter((item) => item !== '');
            }

            if (valueArray.length > 0) {
              result[key.trim()] = valueArray;
            }
          }
        }

        return result;
      } catch (jsonError) {
        // Fall through to legacy string parsing
      }
    }

    // Legacy string format parsing (backward compatibility)
    // Format: "Original Title:Alternative Title 1,Alternative Title 2;Another Original:Alternative"
    const pairs = trimmedInput.split(';');

    for (const pair of pairs) {
      // Each pair should be in format "Original:Alternative1,Alternative2"
      const [original, alternativesStr] = pair.split(':');

      if (!original || !alternativesStr) {
        continue;
      }

      const originalTitle = original.trim();
      const alternatives = alternativesStr
        .split(',')
        .map((alt: string) => alt.trim())
        .filter((alt: string) => alt !== '');

      if (originalTitle && alternatives.length > 0) {
        result[originalTitle] = alternatives;
      }
    }
  } catch (error) {
    console.error('Error parsing custom titles:', error);
  }

  return result;
}

/**
 * Gets combined title translations from custom string and existing translations
 * @param customTitlesStr String from the configuration
 * @param existingTranslations Existing translations to combine with
 * @returns Combined record of original titles to arrays of alternative titles
 */
export function getCombinedTitleTranslations(
  customTitlesStr: string,
  existingTranslations: Record<string, string[]> = {}
): Record<string, string[]> {
  const customTitles = parseCustomTitles(customTitlesStr);

  // Combine existing translations with custom ones
  // Custom translations take precedence if there's a conflict
  return {
    ...existingTranslations,
    ...customTitles,
  };
}

/**
 * Gets potential alternative titles in other languages based on the original title
 * @param title The original title
 * @param customTitlesStr Optional string with custom title translations from configuration
 * @returns Array of potential alternative titles including the original one
 */
export function getAlternativeTitles(
  title: string,
  customTitlesStr?: string
): string[] {
  // Use custom translations or empty object if not provided
  const combined = customTitlesStr ? parseCustomTitles(customTitlesStr) : {};

  // If no translations available, just return the original title
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
  for (const [englishTitle, translations] of Object.entries(combined)) {
    // Skip checking very short titles (3 characters or less) to avoid false matches
    if (englishTitle.length <= 3) continue;

    if (title.toLowerCase().includes(englishTitle.toLowerCase())) {
      foundMatch = true;
      // Title contains a known English title, add the translated equivalents
      for (const translation of translations) {
        const translatedTitle = title.replace(
          new RegExp(englishTitle, 'i'),
          translation
        );
        if (!alternatives.includes(translatedTitle)) {
          alternatives.push(translatedTitle);
        }
      }
    }

    // Also check if the title might be a translated title we know
    for (const translatedTitle of translations) {
      // Skip checking very short titles to avoid false matches
      if (translatedTitle.length <= 3) continue;

      if (title.toLowerCase().includes(translatedTitle.toLowerCase())) {
        foundMatch = true;
        // Title contains a known translated title, add the English equivalent
        const englishTitle1 = title.replace(
          new RegExp(translatedTitle, 'i'),
          englishTitle
        );
        if (!alternatives.includes(englishTitle1)) {
          alternatives.push(englishTitle1);
        }
      }
    }
  }

  // Log whether we found any matches
  if (foundMatch) {
    console.log(
      `Found ${alternatives.length - 1} alternative titles for "${title}"`
    );
  } else {
    console.log(`No alternative titles found for "${title}"`);
  }

  return alternatives;
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
