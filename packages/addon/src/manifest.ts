import { Manifest, ManifestCatalog, ContentType } from 'stremio-addon-sdk';
import { translations, DEFAULT_LANGUAGE } from './i18n';

const { version, description } = require('../package.json');

// Prepare catalog structure
export const catalog: ManifestCatalog = {
  id: 'easynews-catalogs',
  name: 'Easynews Catalog',
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
};

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
  config: [
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
      options: languageOptions,
      default: '',
    },
    {
      title: englishTranslations.form.sortingMethod,
      key: 'sortingPreference',
      type: 'select',
      options: sortingOptions,
      default: 'quality_first',
    },
    {
      title: englishTranslations.form.uiLanguage,
      key: 'uiLanguage',
      type: 'select',
      options: uiLanguageOptions,
      default: 'eng',
    },
  ],
};
