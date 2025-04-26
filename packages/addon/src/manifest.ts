import { Manifest, ManifestCatalog, ContentType } from 'stremio-addon-sdk';
import { translations, DEFAULT_LANGUAGE } from './i18n';

import { version, description } from '../../../package.json';

// Prepare catalog structure
export const catalog: ManifestCatalog = {
  id: 'easynews-plus-plus',
  name: 'Easynews++',
  type: 'tv' as ContentType,
  extra: [{ name: 'search', isRequired: true }],
};

// Get the English translations for the initial setup
const englishTranslations = translations[DEFAULT_LANGUAGE];

// Language options for the preferred language selector
const languageOptions = {
  '': englishTranslations.languages.noPreference,
  eng: englishTranslations.languages.english,
  ger: englishTranslations.languages.german,
  spa: englishTranslations.languages.spanish,
  fre: englishTranslations.languages.french,
  ita: englishTranslations.languages.italian,
  jpn: englishTranslations.languages.japanese,
  por: englishTranslations.languages.portuguese,
  rus: englishTranslations.languages.russian,
  kor: englishTranslations.languages.korean,
  chi: englishTranslations.languages.chinese,
  dut: englishTranslations.languages.dutch,
  rum: englishTranslations.languages.romanian,
  bul: englishTranslations.languages.bulgarian,
} as any;

// Sorting preference options
const sortingOptions = {
  quality_first: englishTranslations.sortingOptions.qualityFirst,
  language_first: englishTranslations.sortingOptions.languageFirst,
  size_first: englishTranslations.sortingOptions.sizeFirst,
  date_first: englishTranslations.sortingOptions.dateFirst,
  relevance_first: englishTranslations.sortingOptions.relevanceFirst,
} as any;

// Create UI language options
const uiLanguageOptions = {
  eng: 'English',
  ger: 'Deutsch (German)',
  spa: 'Español (Spanish)',
  fre: 'Français (French)',
  ita: 'Italiano (Italian)',
  jpn: '日本語 (Japanese)',
  por: 'Português (Portuguese)',
  rus: 'Русский (Russian)',
  kor: '한국어 (Korean)',
  chi: '中文 (Chinese)',
  dut: 'Nederlands (Dutch)',
  rum: 'Română (Romanian)',
  bul: 'Български (Bulgarian)',
} as Record<string, string>;

// Quality options for streams
const qualityOptions = {
  '4k,1080p,720p,480p': englishTranslations.qualityOptions.allQualities,
  '4k': '4K/UHD/2160p',
  '1080p': '1080p/FHD',
  '720p': '720p/HD',
  '480p': '480p/SD',
  '4k,1080p': '4K + 1080p',
  '1080p,720p': '1080p + 720p',
  '720p,480p': '720p + 480p',
  '4k,1080p,720p': '4K + 1080p + 720p',
  '1080p,720p,480p': '1080p + 720p + 480p',
} as Record<string, string>;

export const manifest: Manifest = {
  id: 'community.easynews-plus-plus',
  version,
  description,
  catalogs: [catalog],
  resources: [
    'catalog',
    { name: 'meta', types: ['tv'], idPrefixes: [catalog.id] },
    { name: 'stream', types: ['movie', 'series'], idPrefixes: ['tt'] },
  ],
  types: ['movie', 'series', 'tv'],
  name: 'Easynews++',
  background: 'https://i.imgur.com/QPPXf5T.jpeg',
  logo: 'https://pbs.twimg.com/profile_images/479627852757733376/8v9zH7Yo_400x400.jpeg',
  behaviorHints: { configurable: true, configurationRequired: true },
  stremioAddonsConfig: {
    issuer: 'https://stremio-addons.net',
    signature:
      'eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2In0..51PLy1tUzMKnIWRNR4A7LA.t7KcM925cLQphqv-9WHr59YPtO-snyEl5wBeYvWYs9JlW3tFZ8P_WeGwzVBhVVELh5b3976B8CbnwXVFamteW3suTTf9FnBUMY29NUvn20qQX70EshoCaFh3dy9uowcB.bYVYPWa02j8x1RNx7UG59A',
  },
  config: [
    {
      title: englishTranslations.form.uiLanguage,
      key: 'uiLanguage',
      type: 'select',
      options: uiLanguageOptions as any,
      default: 'eng',
    },
    { title: englishTranslations.form.username, key: 'username', type: 'text' },
    {
      title: englishTranslations.form.password,
      key: 'password',
      type: 'password',
    },
    {
      title: englishTranslations.form.strictTitleMatching,
      key: 'strictTitleMatching',
      type: 'checkbox',
      default: 'false',
    },
    {
      title: englishTranslations.form.preferredLanguage,
      key: 'preferredLanguage',
      type: 'select',
      options: languageOptions as any,
      default: '',
    },
    {
      title: englishTranslations.form.sortingMethod,
      key: 'sortingPreference',
      type: 'select',
      options: sortingOptions as any,
      default: 'quality_first',
    },
    {
      title: englishTranslations.form.showQualities,
      key: 'showQualities',
      type: 'select',
      options: qualityOptions as any,
      default: '4k,1080p,720p,480p',
    },
    {
      title: englishTranslations.form.maxResultsPerQuality,
      key: 'maxResultsPerQuality',
      type: 'number',
      default: '0',
    },
    {
      title: englishTranslations.form.maxFileSize,
      key: 'maxFileSize',
      type: 'number',
      default: '0',
    },
  ],
};
