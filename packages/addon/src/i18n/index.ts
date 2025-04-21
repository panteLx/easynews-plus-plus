/**
 * Internationalization (i18n) module for the Easynews++ addon
 */

// Define the supported languages
export type Language =
  | 'en'
  | 'de'
  | 'es'
  | 'fr'
  | 'it'
  | 'ja'
  | 'pt'
  | 'ru'
  | 'ko'
  | 'zh';

// Key-value structure for translations
export type TranslationKeys = {
  // Configuration page
  configPage: {
    title: string;
    copyConfig: string;
    addToStremio: string;
    configCopied: string;
    version: string;
    description: string;
  };
  // Form fields
  form: {
    username: string;
    password: string;
    strictTitleMatching: string;
    preferredLanguage: string;
    sortingMethod: string;
    uiLanguage: string;
  };
  // Languages
  languages: {
    noPreference: string;
    english: string;
    german: string;
    spanish: string;
    french: string;
    italian: string;
    japanese: string;
    portuguese: string;
    russian: string;
    korean: string;
    chinese: string;
  };
  // Sorting options
  sortingOptions: {
    qualityFirst: string;
    languageFirst: string;
    sizeFirst: string;
    dateFirst: string;
    relevanceFirst: string;
  };
};

// Translation dictionary type
export type Translations = Record<Language, TranslationKeys>;

// Default language
export const DEFAULT_LANGUAGE: Language = 'en';

// Map ISO codes to our language keys
export const ISO_TO_LANGUAGE: Record<string, Language> = {
  eng: 'en',
  ger: 'de',
  spa: 'es',
  fre: 'fr',
  ita: 'it',
  jpn: 'ja',
  por: 'pt',
  rus: 'ru',
  kor: 'ko',
  chi: 'zh',
  // Default to English if not found
  '': 'en',
};

// Language to ISO mapping (reverse of above)
export const LANGUAGE_TO_ISO: Record<Language, string> = {
  en: 'eng',
  de: 'ger',
  es: 'spa',
  fr: 'fre',
  it: 'ita',
  ja: 'jpn',
  pt: 'por',
  ru: 'rus',
  ko: 'kor',
  zh: 'chi',
};

// All supported languages with their display names
export const SUPPORTED_LANGUAGES: Record<Language, string> = {
  en: 'English',
  de: 'Deutsch (German)',
  es: 'Español (Spanish)',
  fr: 'Français (French)',
  it: 'Italiano (Italian)',
  ja: '日本語 (Japanese)',
  pt: 'Português (Portuguese)',
  ru: 'Русский (Russian)',
  ko: '한국어 (Korean)',
  zh: '中文 (Chinese)',
};

/**
 * Get the translations for the given language code
 * @param langCode Language code (ISO or our internal code)
 * @returns Translations object or the default (English) translations
 */
export function getTranslations(langCode: string): TranslationKeys {
  // Convert ISO code to our language code if needed
  const language = ISO_TO_LANGUAGE[langCode] || (langCode as Language);

  // Return translations if language is supported, otherwise fall back to English
  return language in translations
    ? translations[language]
    : translations[DEFAULT_LANGUAGE];
}

/**
 * Gets the user interface language from the configuration
 * @param preferredLanguage Language from the config (ISO code)
 * @returns The appropriate language code to use
 */
export function getUILanguage(preferredLanguage?: string): Language {
  if (!preferredLanguage) return DEFAULT_LANGUAGE;
  return ISO_TO_LANGUAGE[preferredLanguage] || DEFAULT_LANGUAGE;
}

// Define all the translations
export const translations: Translations = {
  // English (Default)
  en: {
    configPage: {
      title: 'Configuration',
      copyConfig: 'Copy Configuration',
      addToStremio: 'Add to Stremio',
      configCopied: 'Copied!',
      version: 'Version',
      description:
        'Easynews++ is an open-source addon that enhances the Easynews experience with superior performance, advanced search capabilities, and intelligent stream selection. It features custom title support, multi-platform compatibility, and self-hosting options. Join our community on Discord (discord.gg/Ma4SnagqwE) or contribute on GitHub (github.com/panteLx/easynews-plus-plus)',
    },
    form: {
      username: 'Username',
      password: 'Password',
      strictTitleMatching:
        "Strict Title Matching (to filter out results that don't exactly match the movie or series title)",
      preferredLanguage: 'Preferred Audio Language',
      sortingMethod: 'Sorting Method',
      uiLanguage: 'UI Language',
    },
    languages: {
      noPreference: 'No preference',
      english: 'English',
      german: 'German (Deutsch)',
      spanish: 'Spanish (Español)',
      french: 'French (Français)',
      italian: 'Italian (Italiano)',
      japanese: 'Japanese (日本語)',
      portuguese: 'Portuguese (Português)',
      russian: 'Russian (Русский)',
      korean: 'Korean (한국어)',
      chinese: 'Chinese (中文)',
    },
    sortingOptions: {
      qualityFirst: 'Quality (4K → 1080p → 720p)',
      languageFirst: 'Preferred Language, then Quality',
      sizeFirst: 'File Size (largest first)',
      dateFirst: 'Date Added (newest first)',
      relevanceFirst: 'Relevance (best matches first)',
    },
  },
  // German
  de: {
    configPage: {
      title: 'Konfiguration',
      copyConfig: 'Konfiguration kopieren',
      addToStremio: 'Zu Stremio hinzufügen',
      configCopied: 'Kopiert!',
      version: 'Version',
      description:
        'Easynews++ ist ein Open-Source-Addon, das die Easynews-Erfahrung mit überlegener Leistung, erweiterten Suchfunktionen und intelligenter Stream-Auswahl verbessert. Es bietet benutzerdefinierte Titelunterstützung, Multi-Plattform-Kompatibilität und Self-Hosting-Optionen. Trete unserer Community auf Discord bei (discord.gg/Ma4SnagqwE) oder trage auf GitHub bei (github.com/panteLx/easynews-plus-plus)',
    },
    form: {
      username: 'Benutzername',
      password: 'Passwort',
      strictTitleMatching:
        'Strikte Titelübereinstimmung (um Ergebnisse herauszufiltern, die nicht exakt mit dem Film- oder Serientitel übereinstimmen)',
      preferredLanguage: 'Bevorzugte Audiosprache',
      sortingMethod: 'Sortiermethode',
      uiLanguage: 'UI-Sprache',
    },
    languages: {
      noPreference: 'Keine Präferenz',
      english: 'Englisch (English)',
      german: 'Deutsch (German)',
      spanish: 'Spanisch (Español)',
      french: 'Französisch (Français)',
      italian: 'Italienisch (Italiano)',
      japanese: 'Japanisch (日本語)',
      portuguese: 'Portugiesisch (Português)',
      russian: 'Russisch (Русский)',
      korean: 'Koreanisch (한국어)',
      chinese: 'Chinesisch (中文)',
    },
    sortingOptions: {
      qualityFirst: 'Qualität (4K → 1080p → 720p)',
      languageFirst: 'Bevorzugte Sprache, dann Qualität',
      sizeFirst: 'Dateigröße (größte zuerst)',
      dateFirst: 'Hinzugefügt am (neueste zuerst)',
      relevanceFirst: 'Relevanz (beste Treffer zuerst)',
    },
  },
  // Spanish
  es: {
    configPage: {
      title: 'Configuración',
      copyConfig: 'Copiar configuración',
      addToStremio: 'Añadir a Stremio',
      configCopied: '¡Copiado!',
      version: 'Versión',
      description:
        'Easynews++ es un complemento de código abierto que mejora la experiencia de Easynews con un rendimiento superior, capacidades de búsqueda avanzadas y selección inteligente de transmisiones. Cuenta con soporte de títulos personalizados, compatibilidad multiplataforma y opciones de alojamiento propio. Únase a nuestra comunidad en Discord (discord.gg/Ma4SnagqwE) o contribuya en GitHub (github.com/panteLx/easynews-plus-plus)',
    },
    form: {
      username: 'Nombre de usuario',
      password: 'Contraseña',
      strictTitleMatching:
        'Coincidencia estricta de títulos (para filtrar resultados que no coincidan exactamente con el título de la película o serie)',
      preferredLanguage: 'Idioma de audio preferido',
      sortingMethod: 'Método de clasificación',
      uiLanguage: 'Idioma de la interfaz de usuario',
    },
    languages: {
      noPreference: 'Sin preferencia',
      english: 'Inglés (English)',
      german: 'Alemán (Deutsch)',
      spanish: 'Español (Spanish)',
      french: 'Francés (Français)',
      italian: 'Italiano (Italiano)',
      japanese: 'Japonés (日本語)',
      portuguese: 'Portugués (Português)',
      russian: 'Ruso (Русский)',
      korean: 'Coreano (한국어)',
      chinese: 'Chino (中文)',
    },
    sortingOptions: {
      qualityFirst: 'Calidad (4K → 1080p → 720p)',
      languageFirst: 'Idioma preferido, luego calidad',
      sizeFirst: 'Tamaño de archivo (más grande primero)',
      dateFirst: 'Fecha de adición (más recientes primero)',
      relevanceFirst: 'Relevancia (mejores coincidencias primero)',
    },
  },
  // French
  fr: {
    configPage: {
      title: 'Configuration',
      copyConfig: 'Copier la configuration',
      addToStremio: 'Ajouter à Stremio',
      configCopied: 'Copié !',
      version: 'Version',
      description:
        "Easynews++ est un addon open-source qui améliore l'expérience Easynews avec des performances supérieures, des capacités de recherche avancées et une sélection intelligente des flux. Il propose le support de titres personnalisés, la compatibilité multi-plateformes et des options d'auto-hébergement. Rejoignez notre communauté sur Discord (discord.gg/Ma4SnagqwE) ou contribuez sur GitHub (github.com/panteLx/easynews-plus-plus)",
    },
    form: {
      username: "Nom d'utilisateur",
      password: 'Mot de passe',
      strictTitleMatching:
        'Correspondance stricte des titres (pour filtrer les résultats qui ne correspondent pas exactement au titre du film ou de la série)',
      preferredLanguage: 'Langue audio préférée',
      sortingMethod: 'Méthode de tri',
      uiLanguage: "Langue de l'interface",
    },
    languages: {
      noPreference: 'Sans préférence',
      english: 'Anglais (English)',
      german: 'Allemand (Deutsch)',
      spanish: 'Espagnol (Español)',
      french: 'Français (French)',
      italian: 'Italien (Italiano)',
      japanese: 'Japonais (日本語)',
      portuguese: 'Portugais (Português)',
      russian: 'Russe (Русский)',
      korean: 'Coréen (한국어)',
      chinese: 'Chinois (中文)',
    },
    sortingOptions: {
      qualityFirst: 'Qualité (4K → 1080p → 720p)',
      languageFirst: 'Langue préférée, puis qualité',
      sizeFirst: "Taille du fichier (plus grand d'abord)",
      dateFirst: "Date d'ajout (plus récent d'abord)",
      relevanceFirst: "Pertinence (meilleures correspondances d'abord)",
    },
  },
  // Italian
  it: {
    configPage: {
      title: 'Configurazione',
      copyConfig: 'Copia configurazione',
      addToStremio: 'Aggiungi a Stremio',
      configCopied: 'Copiato!',
      version: 'Versione',
      description:
        "Easynews++ è un addon open-source che migliora l'esperienza di Easynews con prestazioni superiori, funzionalità di ricerca avanzate e selezione intelligente dei flussi. Include supporto per titoli personalizzati, compatibilità multi-piattaforma e opzioni di self-hosting. Unisciti alla nostra comunità su Discord (discord.gg/Ma4SnagqwE) o contribuisci su GitHub (github.com/panteLx/easynews-plus-plus)",
    },
    form: {
      username: 'Nome utente',
      password: 'Password',
      strictTitleMatching:
        'Corrispondenza esatta dei titoli (per filtrare i risultati che non corrispondono esattamente al titolo del film o della serie)',
      preferredLanguage: 'Lingua audio preferita',
      sortingMethod: 'Metodo di ordinamento',
      uiLanguage: "Lingua dell'interfaccia utente",
    },
    languages: {
      noPreference: 'Nessuna preferenza',
      english: 'Inglese (English)',
      german: 'Tedesco (Deutsch)',
      spanish: 'Spagnolo (Español)',
      french: 'Francese (Français)',
      italian: 'Italiano (Italian)',
      japanese: 'Giapponese (日本語)',
      portuguese: 'Portoghese (Português)',
      russian: 'Russo (Русский)',
      korean: 'Coreano (한국어)',
      chinese: 'Cinese (中文)',
    },
    sortingOptions: {
      qualityFirst: 'Qualità (4K → 1080p → 720p)',
      languageFirst: 'Lingua preferita, poi qualità',
      sizeFirst: 'Dimensione file (i più grandi prima)',
      dateFirst: 'Data di aggiunta (i più recenti prima)',
      relevanceFirst: 'Rilevanza (migliori corrispondenze prima)',
    },
  },
  // Japanese
  ja: {
    configPage: {
      title: '設定',
      copyConfig: '設定をコピー',
      addToStremio: 'Stremioに追加',
      configCopied: 'コピーしました！',
      version: 'バージョン',
      description:
        'Easynews++は、優れたパフォーマンス、高度な検索機能、インテリジェントなストリーム選択でEasynewsの体験を向上させるオープンソースアドオンです。カスタムタイトルのサポート、マルチプラットフォームの互換性、セルフホスティングオプションを備えています。Discordのコミュニティに参加する（discord.gg/Ma4SnagqwE）か、GitHubで貢献してください（github.com/panteLx/easynews-plus-plus）',
    },
    form: {
      username: 'ユーザー名',
      password: 'パスワード',
      strictTitleMatching:
        '厳密なタイトル一致（映画やシリーズのタイトルに正確に一致しない結果をフィルタリング）',
      preferredLanguage: '優先する音声言語',
      sortingMethod: '並べ替え方法',
      uiLanguage: 'UI言語',
    },
    languages: {
      noPreference: '優先なし',
      english: '英語 (English)',
      german: 'ドイツ語 (Deutsch)',
      spanish: 'スペイン語 (Español)',
      french: 'フランス語 (Français)',
      italian: 'イタリア語 (Italiano)',
      japanese: '日本語 (Japanese)',
      portuguese: 'ポルトガル語 (Português)',
      russian: 'ロシア語 (Русский)',
      korean: '韓国語 (한국어)',
      chinese: '中国語 (中文)',
    },
    sortingOptions: {
      qualityFirst: '画質優先 (4K → 1080p → 720p)',
      languageFirst: '優先言語、次に画質',
      sizeFirst: 'ファイルサイズ（最大優先）',
      dateFirst: '追加日（最新優先）',
      relevanceFirst: '関連性（最良の一致優先）',
    },
  },
  // Portuguese
  pt: {
    configPage: {
      title: 'Configuração',
      copyConfig: 'Copiar configuração',
      addToStremio: 'Adicionar ao Stremio',
      configCopied: 'Copiado!',
      version: 'Versão',
      description:
        'Easynews++ é um addon de código aberto que melhora a experiência do Easynews com desempenho superior, recursos de pesquisa avançados e seleção inteligente de streams. Ele oferece suporte a títulos personalizados, compatibilidade multiplataforma e opções de hospedagem própria. Junte-se à nossa comunidade no Discord (discord.gg/Ma4SnagqwE) ou contribua no GitHub (github.com/panteLx/easynews-plus-plus)',
    },
    form: {
      username: 'Nome de usuário',
      password: 'Senha',
      strictTitleMatching:
        'Correspondência estrita de títulos (para filtrar resultados que não correspondam exatamente ao título do filme ou série)',
      preferredLanguage: 'Idioma de áudio preferido',
      sortingMethod: 'Método de classificação',
      uiLanguage: 'Idioma da interface de usuário',
    },
    languages: {
      noPreference: 'Sem preferência',
      english: 'Inglês (English)',
      german: 'Alemão (Deutsch)',
      spanish: 'Espanhol (Español)',
      french: 'Francês (Français)',
      italian: 'Italiano (Italiano)',
      japanese: 'Japonês (日本語)',
      portuguese: 'Português (Portuguese)',
      russian: 'Russo (Русский)',
      korean: 'Coreano (한국어)',
      chinese: 'Chinês (中文)',
    },
    sortingOptions: {
      qualityFirst: 'Qualidade (4K → 1080p → 720p)',
      languageFirst: 'Idioma preferido, depois qualidade',
      sizeFirst: 'Tamanho do arquivo (maiores primeiro)',
      dateFirst: 'Data de adição (mais recentes primeiro)',
      relevanceFirst: 'Relevância (melhores correspondências primeiro)',
    },
  },
  // Russian
  ru: {
    configPage: {
      title: 'Конфигурация',
      copyConfig: 'Копировать конфигурацию',
      addToStremio: 'Добавить в Stremio',
      configCopied: 'Скопировано!',
      version: 'Версия',
      description:
        'Easynews++ — это дополнение с открытым исходным кодом, которое улучшает работу с Easynews благодаря превосходной производительности, расширенным возможностям поиска и интеллектуальному выбору потоков. Оно имеет поддержку пользовательских заголовков, совместимость с несколькими платформами и возможности самостоятельного размещения. Присоединяйтесь к нашему сообществу в Discord (discord.gg/Ma4SnagqwE) или вносите вклад на GitHub (github.com/panteLx/easynews-plus-plus)',
    },
    form: {
      username: 'Имя пользователя',
      password: 'Пароль',
      strictTitleMatching:
        'Строгое соответствие названия (для фильтрации результатов, которые не точно соответствуют названию фильма или сериала)',
      preferredLanguage: 'Предпочтительный язык аудио',
      sortingMethod: 'Метод сортировки',
      uiLanguage: 'Язык интерфейса',
    },
    languages: {
      noPreference: 'Без предпочтений',
      english: 'Английский (English)',
      german: 'Немецкий (Deutsch)',
      spanish: 'Испанский (Español)',
      french: 'Французский (Français)',
      italian: 'Итальянский (Italiano)',
      japanese: 'Японский (日本語)',
      portuguese: 'Португальский (Português)',
      russian: 'Русский (Russian)',
      korean: 'Корейский (한국어)',
      chinese: 'Китайский (中文)',
    },
    sortingOptions: {
      qualityFirst: 'Качество (4K → 1080p → 720p)',
      languageFirst: 'Предпочтительный язык, затем качество',
      sizeFirst: 'Размер файла (сначала наибольшие)',
      dateFirst: 'Дата добавления (сначала новейшие)',
      relevanceFirst: 'Релевантность (сначала лучшие совпадения)',
    },
  },
  // Korean
  ko: {
    configPage: {
      title: '설정',
      copyConfig: '설정 복사',
      addToStremio: 'Stremio에 추가',
      configCopied: '복사됨!',
      version: '버전',
      description:
        'Easynews++는 뛰어난 성능, 고급 검색 기능 및 지능형 스트림 선택으로 Easynews 경험을 향상시키는 오픈 소스 애드온입니다. 사용자 정의 제목 지원, 다중 플랫폼 호환성 및 자체 호스팅 옵션을 제공합니다. Discord에서 커뮤니티에 참여하거나(discord.gg/Ma4SnagqwE) GitHub에서 기여하세요(github.com/panteLx/easynews-plus-plus)',
    },
    form: {
      username: '사용자 이름',
      password: '비밀번호',
      strictTitleMatching:
        '엄격한 제목 일치 (영화나 시리즈 제목과 정확히 일치하지 않는 결과 필터링)',
      preferredLanguage: '선호하는 오디오 언어',
      sortingMethod: '정렬 방법',
      uiLanguage: 'UI 언어',
    },
    languages: {
      noPreference: '선호도 없음',
      english: '영어 (English)',
      german: '독일어 (Deutsch)',
      spanish: '스페인어 (Español)',
      french: '프랑스어 (Français)',
      italian: '이탈리아어 (Italiano)',
      japanese: '일본어 (日本語)',
      portuguese: '포르투갈어 (Português)',
      russian: '러시아어 (Русский)',
      korean: '한국어 (Korean)',
      chinese: '중국어 (中文)',
    },
    sortingOptions: {
      qualityFirst: '화질 (4K → 1080p → 720p)',
      languageFirst: '선호 언어, 그다음 화질',
      sizeFirst: '파일 크기 (큰 것 우선)',
      dateFirst: '추가된 날짜 (최신 우선)',
      relevanceFirst: '관련성 (가장 일치하는 것 우선)',
    },
  },
  // Chinese
  zh: {
    configPage: {
      title: '配置',
      copyConfig: '复制配置',
      addToStremio: '添加到 Stremio',
      configCopied: '已复制!',
      version: '版本',
      description:
        'Easynews++是一个开源插件，通过卓越的性能、高级搜索功能和智能流选择增强Easynews体验。它具有自定义标题支持、多平台兼容性和自托管选项。加入我们的Discord社区(discord.gg/Ma4SnagqwE)或在GitHub上贡献(github.com/panteLx/easynews-plus-plus)',
    },
    form: {
      username: '用户名',
      password: '密码',
      strictTitleMatching:
        '严格标题匹配（过滤掉与电影或剧集标题不完全匹配的结果）',
      preferredLanguage: '首选音频语言',
      sortingMethod: '排序方法',
      uiLanguage: 'UI 语言',
    },
    languages: {
      noPreference: '无偏好',
      english: '英语 (English)',
      german: '德语 (Deutsch)',
      spanish: '西班牙语 (Español)',
      french: '法语 (Français)',
      italian: '意大利语 (Italiano)',
      japanese: '日语 (日本語)',
      portuguese: '葡萄牙语 (Português)',
      russian: '俄语 (Русский)',
      korean: '韩语 (한국어)',
      chinese: '中文 (Chinese)',
    },
    sortingOptions: {
      qualityFirst: '质量 (4K → 1080p → 720p)',
      languageFirst: '首选语言，然后是质量',
      sizeFirst: '文件大小（最大优先）',
      dateFirst: '添加日期（最新优先）',
      relevanceFirst: '相关性（最佳匹配优先）',
    },
  },
};
