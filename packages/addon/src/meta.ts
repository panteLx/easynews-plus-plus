import { extractDigits, getAlternativeTitles } from './utils';

export type MetaProviderResponse = {
  name: string;
  originalName?: string; // Original name before any custom titles
  alternativeNames?: string[]; // Alternative names/custom titles
  year?: number;
  season?: string;
  episode?: string;
};

async function imdbMetaProvider(id: string): Promise<MetaProviderResponse> {
  var [tt, season, episode] = id.split(':');

  return fetch(`https://v2.sg.media-imdb.com/suggestion/t/${tt}.json`)
    .then(res => res.json())
    .then(json => {
      return json.d.find((item: { id: string }) => item.id === tt);
    })
    .then(({ l, y }) => {
      // Get original name and potential custom titles
      const originalName = l;
      const alternativeNames = getAlternativeTitles(originalName);

      return {
        name: originalName,
        originalName,
        alternativeNames,
        year: y,
        season,
        episode,
      };
    });
}

async function cinemetaMetaProvider(id: string, type: string): Promise<MetaProviderResponse> {
  var [tt, season, episode] = id.split(':');

  return fetch(`https://v3-cinemeta.strem.io/meta/${type}/${tt}.json`)
    .then(res => res.json())
    .then(json => {
      const meta = json.meta;
      const name = meta.name;
      const year = extractDigits(meta.year ?? meta.releaseInfo);

      // Get original name and potential custom titles
      const originalName = name;
      const alternativeNames = getAlternativeTitles(originalName);

      return {
        name,
        originalName,
        alternativeNames,
        year,
        episode,
        season,
      } satisfies MetaProviderResponse;
    });
}

/**
 * Fetches metadata from IMDB and use Cinemeta as a fallback.
 */
export async function publicMetaProvider(id: string, type: string): Promise<MetaProviderResponse> {
  return imdbMetaProvider(id)
    .then(meta => {
      if (meta.name) {
        return meta;
      }

      return cinemetaMetaProvider(id, type);
    })
    .then(meta => {
      if (meta.name) {
        return meta;
      }

      throw new Error('Failed to find metadata');
    });
}
