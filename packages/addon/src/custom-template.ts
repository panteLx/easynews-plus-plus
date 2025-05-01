import { Manifest } from 'stremio-addon-sdk';
import { getTranslations, ISO_TO_LANGUAGE } from './i18n';
import { logger } from './utils';

function landingTemplate(manifest: Manifest): string {
  const configurationFields = manifest.config || [];

  // Find UI language field to determine which language to use
  const uiLanguageField = configurationFields.find((field: any) => field.key === 'uiLanguage');
  const defaultUILanguage = uiLanguageField?.default || 'eng';

  // Get translations based on the default UI language
  const translations = getTranslations(defaultUILanguage);

  // For debugging
  logger.debug(`Using UI language: ${defaultUILanguage}, translations found: ${!!translations}`);
  logger.debug(`Translations loaded:`, JSON.stringify(translations).substring(0, 200) + '...');

  // Add a timestamp parameter to prevent caching
  const cacheBreaker = Date.now();

  // Create a description text based on the language
  let description = manifest.description || '';

  // Replace the field titles with their translated versions if they exist
  const translatedFields = configurationFields.map((field: any) => {
    if (field.key === 'username' && translations.form.username) {
      return { ...field, title: 'Easynews ' + translations.form.username };
    } else if (field.key === 'password' && translations.form.password) {
      return { ...field, title: 'Easynews ' + translations.form.password };
    } else if (field.key === 'strictTitleMatching' && translations.form.strictTitleMatching) {
      return {
        ...field,
        title: translations.form.strictTitleMatching,
        hint: translations.form.strictTitleMatchingHint,
      };
    } else if (field.key === 'sortingPreference' && translations.form.sortingMethod) {
      // For sorting preference field, translate both title and options
      const translatedOptions: Record<string, string> = {};
      if (field.options) {
        if (
          field.options['quality_first'] !== undefined &&
          translations.sortingOptions?.qualityFirst
        ) {
          translatedOptions['quality_first'] = translations.sortingOptions.qualityFirst;
        }
        if (
          field.options['language_first'] !== undefined &&
          translations.sortingOptions?.languageFirst
        ) {
          translatedOptions['language_first'] = translations.sortingOptions.languageFirst;
        }
        if (field.options['size_first'] !== undefined && translations.sortingOptions?.sizeFirst) {
          translatedOptions['size_first'] = translations.sortingOptions.sizeFirst;
        }
        if (field.options['date_first'] !== undefined && translations.sortingOptions?.dateFirst) {
          translatedOptions['date_first'] = translations.sortingOptions.dateFirst;
        }
      }
      return {
        ...field,
        title: translations.form.sortingMethod,
        hint: translations.form.sortingMethodHint,
        options: Object.keys(translatedOptions).length > 0 ? translatedOptions : field.options,
      };
    } else if (field.key === 'uiLanguage' && translations.form.uiLanguage) {
      return { ...field, title: translations.form.uiLanguage };
    } else if (field.key === 'showQualities' && translations.form.showQualities) {
      // For showQualities field, translate the title and the "All Qualities" option
      const translatedOptions: Record<string, string> = {};
      if (field.options) {
        // Copy all existing options
        Object.entries(field.options).forEach(([key, value]) => {
          // Check if this is the "All Qualities" option and translate it
          if (key === '4k,1080p,720p,480p' && translations.qualityOptions.allQualities) {
            translatedOptions[key] = translations.qualityOptions.allQualities;
          } else {
            // Keep other options as is
            translatedOptions[key] = value as string;
          }
        });
      }
      return {
        ...field,
        title: translations.form.showQualities,
        options: Object.keys(translatedOptions).length > 0 ? translatedOptions : field.options,
      };
    } else if (field.key === 'maxResultsPerQuality' && translations.form.maxResultsPerQuality) {
      return { ...field, title: translations.form.maxResultsPerQuality };
    } else if (field.key === 'maxFileSize' && translations.form.maxFileSize) {
      return { ...field, title: translations.form.maxFileSize };
    } else if (field.key === 'preferredLanguage' && translations.form.preferredLanguage) {
      // For language selection field, translate both title and options
      const translatedOptions: Record<string, string> = {};
      if (field.options) {
        // Safely access options and translations
        if (field.options[''] !== undefined && translations.languages?.noPreference) {
          translatedOptions[''] = translations.languages.noPreference;
        }
        if (field.options['eng'] !== undefined && translations.languages?.english) {
          translatedOptions['eng'] = translations.languages.english;
        }
        if (field.options['ger'] !== undefined && translations.languages?.german) {
          translatedOptions['ger'] = translations.languages.german;
        }
        if (field.options['spa'] !== undefined && translations.languages?.spanish) {
          translatedOptions['spa'] = translations.languages.spanish;
        }
        if (field.options['fre'] !== undefined && translations.languages?.french) {
          translatedOptions['fre'] = translations.languages.french;
        }
        if (field.options['ita'] !== undefined && translations.languages?.italian) {
          translatedOptions['ita'] = translations.languages.italian;
        }
        if (field.options['jpn'] !== undefined && translations.languages?.japanese) {
          translatedOptions['jpn'] = translations.languages.japanese;
        }
        if (field.options['por'] !== undefined && translations.languages?.portuguese) {
          translatedOptions['por'] = translations.languages.portuguese;
        }
        if (field.options['rus'] !== undefined && translations.languages?.russian) {
          translatedOptions['rus'] = translations.languages.russian;
        }
        if (field.options['kor'] !== undefined && translations.languages?.korean) {
          translatedOptions['kor'] = translations.languages.korean;
        }
        if (field.options['chi'] !== undefined && translations.languages?.chinese) {
          translatedOptions['chi'] = translations.languages.chinese;
        }
        if (field.options['dut'] !== undefined && translations.languages?.dutch) {
          translatedOptions['dut'] = translations.languages.dutch;
        }
        if (field.options['rum'] !== undefined && translations.languages?.romanian) {
          translatedOptions['rum'] = translations.languages.romanian;
        }
        if (field.options['bul'] !== undefined && translations.languages?.bulgarian) {
          translatedOptions['bul'] = translations.languages.bulgarian;
        }
      }
      return {
        ...field,
        title: translations.form.preferredLanguage,
        options: Object.keys(translatedOptions).length > 0 ? translatedOptions : field.options,
      };
    }
    return field;
  });

  return `
<!DOCTYPE html>
<html lang="${ISO_TO_LANGUAGE[defaultUILanguage] || 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
  <meta http-equiv="Pragma" content="no-cache">
  <meta http-equiv="Expires" content="0">
  <link rel="icon" type="image/png" href="${manifest.logo}">
  <title>${manifest.name || manifest.id} - ${translations.configPage.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    :root {
      /* Shadcn-inspired color palette with dark theme */
      --background: hsl(224, 71%, 4%);
      --foreground: hsl(213, 31%, 91%);
      
      --muted: hsl(223, 47%, 11%);
      --muted-foreground: hsl(215, 16%, 70%);
      
      --card: hsl(222, 47%, 7%);
      --card-foreground: hsl(213, 31%, 91%);
      
      --popover: hsl(224, 71%, 4%);
      --popover-foreground: hsl(215, 20%, 65%);
      
      --border: hsl(216, 34%, 17%);
      --input: hsl(216, 34%, 17%);
      
      --primary: hsl(210, 100%, 50%);
      --primary-foreground: hsl(0, 0%, 98%);
      
      --secondary: hsl(222, 47%, 11%);
      --secondary-foreground: hsl(210, 40%, 98%);
      
      --accent: hsl(210, 40%, 20%);
      --accent-foreground: hsl(210, 40%, 98%);
      
      --destructive: hsl(0, 63%, 31%);
      --destructive-foreground: hsl(210, 40%, 98%);
      
      --ring: hsl(212.7, 26.8%, 83.9%);
      
      /* Typography */
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      
      /* Measurements */
      --radius: 0.5rem;
    }
    
    .form-hint {
      font-size: 0.8em;
      font-weight: normal;
      color: var(--muted-foreground);
      font-style: italic;
      display: block;
      margin-top: 0.2rem;
    }
    
    /* Modern scrollbar for browsers that support it */
    ::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }
    
    ::-webkit-scrollbar-track {
      background: var(--muted);
      border-radius: 6px;
    }
    
    ::-webkit-scrollbar-thumb {
      background: hsl(215, 20%, 30%);
      border-radius: 6px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: hsl(215, 20%, 40%);
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    body {
      font-family: var(--font-sans);
      background-color: var(--background);
      color: var(--foreground);
      line-height: 1.7;
      animation: fadeIn 0.3s ease-in-out;
      letter-spacing: -0.011rem;
    }
    
    .background-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(ellipse at top, hsl(224, 71%, 6%), transparent),
                  radial-gradient(ellipse at bottom, hsl(224, 40%, 3%), transparent);
      opacity: 0.7;
      z-index: -1;
    }
    
    .container {
      max-width: 700px;
      margin: 2.5rem auto;
      padding: 2rem;
    }
    
    .card {
      background-color: var(--card);
      border-radius: var(--radius);
      box-shadow: 0 4px 28px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
      padding: 2.25rem;
      margin-bottom: 2rem;
      border: 1px solid var(--border);
      animation: fadeIn 0.4s ease-out;
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
    
    .card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 0.3rem;
      background: linear-gradient(90deg, var(--primary), hsl(250, 100%, 60%));
      opacity: 0.8;
    }
    
    .header {
      display: flex;
      align-items: flex-start;
      gap: 1.75rem;
      margin-bottom: 2.5rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 2rem;
    }
    
    .logo {
      width: 80px;
      height: 80px;
      border-radius: calc(var(--radius) * 0.8);
      object-fit: cover;
      border: 1px solid var(--border);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .logo:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
    
    .title {
      color: var(--foreground);
      margin-bottom: 0.5rem;
      font-weight: 600;
      line-height: 1.2;
      font-size: 1.75rem;
      letter-spacing: -0.025em;
    }
    
    .description {
      color: var(--muted-foreground);
      margin-bottom: 0.5rem;
      font-size: 0.95rem;
    }
    
    .form-group {
      margin-bottom: 1.75rem;
    }
    
    label {
      display: block;
      margin-bottom: 0.5rem;
      color: var(--foreground);
      font-weight: 500;
      font-size: 0.9rem;
    }
    
    input[type="text"],
    input[type="password"],
    input[type="number"],
    select {
      width: 100%;
      padding: 0.75rem 0.9rem;
      font-size: 0.95rem;
      border: 1px solid var(--input);
      border-radius: var(--radius);
      background-color: var(--secondary);
      color: var(--foreground);
      margin-top: 0.2rem;
      outline: none;
      transition: all 0.15s ease;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
    }
    
    input[type="text"]:focus,
    input[type="password"]:focus,
    input[type="number"]:focus,
    select:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(66, 153, 255, 0.15);
    }
    
    input[type="text"]::placeholder,
    input[type="password"]::placeholder,
    input[type="number"]::placeholder {
      color: var(--muted-foreground);
    }
    
    /* Custom checkbox styles */
    .checkbox-wrapper {
      display: flex;
      align-items: center;
      position: relative;
      margin: 0.3rem 0;
      width: 100%;
      background-color: var(--secondary);
      border-radius: var(--radius);
      border: 1px solid var(--input);
      padding: 0.85rem 1rem;
      transition: all 0.15s ease;
    }
    
    .checkbox-wrapper:hover {
      border-color: var(--primary);
    }
    
    .checkbox-label {
      display: flex;
      align-items: center;
      cursor: pointer;
      user-select: none;
      font-size: 0.9rem;
      width: 100%;
      margin-bottom: 0rem;
    }
    
    .checkbox-label input[type="checkbox"] {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      height: 0;
      width: 0;
    }
    
    .checkmark {
      position: relative;
      display: inline-block;
      flex: 0 0 20px;
      width: 20px;
      height: 20px;
      margin-right: 12px;
      background-color: var(--secondary);
      border: 1px solid var(--border);
      border-radius: 4px;
      transition: all 0.15s ease-in-out;
    }
    
    .checkbox-title {
      flex: 1;
      font-weight: 500;
    }
    
    .checkbox-label:hover input ~ .checkmark {
      border-color: var(--primary);
      background-color: var(--accent);
    }
    
    .checkbox-label input:checked ~ .checkmark {
      background-color: var(--primary);
      border-color: var(--primary);
    }
    
    .checkmark:after {
      content: "";
      position: absolute;
      display: none;
      left: 6px;
      top: 2px;
      width: 5px;
      height: 10px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
    
    .checkbox-label input:checked ~ .checkmark:after {
      display: block;
    }
    
    /* Side-by-side fields */
    .form-row {
      display: flex;
      gap: 1.25rem;
      margin-bottom: 1.75rem;
    }
    
    .form-col {
      flex: 1;
    }
    
    a {
      text-decoration: none;
      color: var(--primary);
      transition: color 0.15s ease;
    }
    
    a:hover {
      color: hsl(210, 100%, 65%);
    }

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background-color: var(--primary);
      color: var(--primary-foreground);
      border: none;
      padding: 0.7rem 1.2rem;
      height: 40px;
      font-size: 0.95rem;
      font-weight: 500;
      border-radius: var(--radius);
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: 0 2px 8px rgba(0, 30, 60, 0.25);
      position: relative;
      overflow: hidden;
      white-space: nowrap;
    }
    
    button:hover {
      background-color: hsl(210, 100.00%, 25.10%);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 30, 60, 0.3);
    }
    
    button:active {
      transform: translateY(1px);
      box-shadow: 0 1px 4px rgba(0, 30, 60, 0.2);
    }
    
    button::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0));
      opacity: 0;
      transition: opacity 0.15s ease;
    }
    
    button:hover::after {
      opacity: 1;
    }
    
    .button-group {
      display: flex;
      justify-content: center;
      gap: 1.25rem;
      margin-top: 2.5rem;
      border-top: 1px solid var(--border);
      padding-top: 2.5rem;
    }
    
    .select-wrapper {
      position: relative;
    }
    
    .select-wrapper::after {
      content: '';
      position: absolute;
      right: 14px;
      top: 50%;
      width: 10px;
      height: 10px;
      pointer-events: none;
      border-right: 2px solid var(--foreground);
      border-bottom: 2px solid var(--foreground);
      transform: translateY(-70%) rotate(45deg);
      opacity: 0.5;
    }
    
    /* Styles for number input arrows */
    input[type="number"] {
      -moz-appearance: textfield;
    }
    
    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    
    select {
      appearance: none;
      -webkit-appearance: none;
      padding-right: 30px;
    }
    
    .version {
      color: var(--muted-foreground);
      text-align: center;
      font-size: 0.85rem;
      margin-top: 1rem;
    }
    
    .copy-button {
      background-color: var(--secondary);
      margin-right: auto;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    
    .copy-button::before {
      content: "";
      display: inline-block;
      width: 16px;
      height: 16px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='9' y='9' width='13' height='13' rx='2' ry='2'%3E%3C/rect%3E%3Cpath d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'%3E%3C/path%3E%3C/svg%3E");
      background-size: contain;
      background-repeat: no-repeat;
    }
    
    .copy-button:hover {
      background-color: var(--accent);
    }
    
    .tooltip {
      position: absolute;
      background-color: var(--popover);
      color: var(--popover-foreground);
      padding: 8px 16px;
      border-radius: var(--radius);
      font-size: 0.85rem;
      opacity: 0;
      transition: all 0.2s ease;
      pointer-events: none;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%) translateY(8px);
      margin-bottom: 10px;
      box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border);
    }
    
    .tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      margin-left: -6px;
      border-width: 6px;
      border-style: solid;
      border-color: var(--border) transparent transparent transparent;
    }
    
    .copy-button-wrapper {
      position: relative;
    }
    
    #installLink button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    
    #installLink button::before {
      content: "";
      display: inline-block;
      width: 16px;
      height: 16px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 5v14'%3E%3C/path%3E%3Cpath d='M5 12h14'%3E%3C/path%3E%3C/svg%3E");
      background-size: contain;
      background-repeat: no-repeat;
    }
    
    @media (max-width: 768px) {
      .container {
        padding: 1.25rem;
        margin: 1rem auto;
      }
      
      .card {
        padding: 1.75rem;
      }
      
      .header {
        flex-direction: column;
        text-align: center;
        gap: 1.25rem;
      }
      
      .header-title-row {
        flex-direction: column;
        gap: 1rem;
      }
      
      .header a button {
        width: 100%;
      }
      
      .button-group {
        flex-direction: column;
        gap: 1rem;
        width: 100%;
      }
      
      .button-group button {
        width: 100%;
        margin: 0;
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
      }
      
      .copy-button {
        margin-right: 0;
        margin-bottom: 0;
        width: 100%;
      }
      
      .form-group {
        margin-bottom: 1.5rem;
      }
      
      input[type="text"],
      input[type="password"],
      select {
        padding: 0.875rem;
        font-size: 1rem;
      }
      
      .checkbox-wrapper {
        padding: 1rem;
      }
      
      .checkbox-title {
        font-size: 1rem;
      }
      
      .form-row {
        flex-direction: column;
        gap: 1.5rem;
      }

      .logo {
        display: none;
      }
    }

    .social-links {
      display: flex;
      justify-content: center;
      gap: 1.25rem;
      margin-top: 1.5rem;
    }

    .social-link {
      color: var(--muted-foreground);
      transition: all 0.15s ease;
      opacity: 0.75;
    }

    .social-link:hover {
      color: var(--primary);
      opacity: 1;
      transform: translateY(-2px);
    }

    .social-link svg {
      width: 22px;
      height: 22px;
    }

    .border {
      border-bottom: 1px solid var(--border);
      // padding-bottom: 1rem;
      max-width: 15%;
      margin: 1.25rem auto;
      opacity: 0.5;
    }
    
    .support-dev-btn {
      background-color: #FFDD00;
      color: #000000;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
    }
    
    .support-dev-btn:hover {
      background-color:rgb(255, 187, 0);
    }
    
    .support-link {
      text-decoration: none;
    }
    
    .header-content {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    
    .header-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    
    /* Add subtle hover effects to inputs */
    input[type="text"]:hover,
    input[type="password"]:hover,
    input[type="number"]:hover,
    select:hover {
      border-color: var(--primary);
    }
    

    /* Add subtle animations */
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
      70% { box-shadow: 0 0 0 13px rgba(59, 130, 246, 0); }
      100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
    }
    
    button:hover {
      animation: pulse 1.5s infinite;
    }
  </style>
</head>
<body>
  <div class="background-container"></div>
  <div class="container">
    <div class="card">
      <div class="header">
        ${manifest.logo ? `<img class="logo" src="${manifest.logo}" alt="${manifest.name || manifest.id} logo">` : ''}
        <div class="header-content">
          <div class="header-title-row">
            <h1 class="title">${manifest.name || manifest.id}</h1>
            <a href="https://www.buymeacoffee.com/pantel?utm_source=addon&ref=dev_support" target="_blank" rel="noopener noreferrer" class="support-link">
              <button type="button" class="support-dev-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                  <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                  <line x1="6" y1="1" x2="6" y2="4"></line>
                  <line x1="10" y1="1" x2="10" y2="4"></line>
                  <line x1="14" y1="1" x2="14" y2="4"></line>
                </svg>
                ${translations.configPage.supportDevelopment}
              </button>
            </a>
          </div>
          <p class="description">${translations.configPage.description}</p>
        </div>
      </div>
      
      <form id="configForm">
        ${translatedFields
          .map((field: any) => {
            if (field.type === 'checkbox') {
              return `
            <div class="form-group">
              <div class="checkbox-wrapper">
                <label class="checkbox-label">
                  <input type="${field.type}" name="${field.key}" ${field.default === 'true' ? 'checked' : ''}>
                  <span class="checkmark"></span>
                  <span class="checkbox-title">${field.title}
                  ${field.hint ? `<span class="form-hint">(${field.hint})</span></span>` : '</span>'}
                </label>
              </div>
            </div>`;
            } else if (field.type === 'select') {
              return `
            <div class="form-group">
              <label for="${field.key}">${field.title}${field.hint ? `<span class="form-hint">(${field.hint})</span>` : ''}</label>
              <div class="select-wrapper">
                <select name="${field.key}" id="${field.key}">
                  ${Object.entries(field.options || {})
                    .map(
                      ([key, value]) => `
                    <option value="${key}" ${field.default === key ? 'selected' : ''}>${value}</option>
                  `
                    )
                    .join('')}
                </select>
              </div>
            </div>`;
            } else {
              // Handle maxResultsPerQuality and maxFileSize fields differently
              if (field.key === 'maxResultsPerQuality') {
                // Store this field to be rendered with maxFileSize
                return `<!-- maxResultsPerQuality -->`;
              } else if (field.key === 'maxFileSize') {
                // Find the maxResultsPerQuality field
                const maxResultsField = translatedFields.find(
                  (f: any) => f.key === 'maxResultsPerQuality'
                );
                if (maxResultsField) {
                  return `
            <div class="form-row">
              <div class="form-col">
                <label for="maxResultsPerQuality">${maxResultsField.title}${maxResultsField.hint ? `<span class="form-hint">(${maxResultsField.hint})</span>` : ''}</label>
                <input type="${maxResultsField.type}" placeholder="${translations.form.noLimit}" name="maxResultsPerQuality" id="maxResultsPerQuality" ${maxResultsField.required ? 'required' : ''}>
              </div>
              <div class="form-col">
                <label for="${field.key}">${field.title}${field.hint ? `<span class="form-hint">(${field.hint})</span>` : ''}</label>
                <input type="${field.type}" placeholder="${translations.form.noLimit}" name="${field.key}" id="${field.key}" ${field.required ? 'required' : ''}>
              </div>
            </div>`;
                } else {
                  return `
            <div class="form-group">
              <label for="${field.key}">${field.title}${field.hint ? `<span class="form-hint">(${field.hint})</span>` : ''}</label>
              <input type="${field.type}" placeholder="${translations.form.noLimit}" name="${field.key}" id="${field.key}" ${field.required ? 'required' : ''}>
            </div>`;
                }
              } else {
                return `
            <div class="form-group">
              <label for="${field.key}">${field.title}${field.hint ? `<span class="form-hint">(${field.hint})</span>` : ''}</label>
              <input type="${field.type}" name="${field.key}" id="${field.key}" ${field.required ? 'required' : ''}>
            </div>`;
              }
            }
          })
          .join('')}
        
        <div class="button-group">
          <div class="copy-button-wrapper">
            <button type="button" id="copyButton" class="copy-button" href="#">${translations.configPage.copyConfig}</button>
            <div id="tooltip" class="tooltip">${translations.configPage.configCopied}</div>
          </div>
          <a id="installLink" href="#">
            <button type="button">${translations.configPage.addToStremio}</button>
          </a>
        </div>
      </form>
    </div>
    
    <div class="social-links">
      <a href="https://github.com/panteLx/easynews-plus-plus" target="_blank" rel="noopener noreferrer" class="social-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
        </svg>
      </a>
      <a href="https://discord.gg/Ma4SnagqwE" target="_blank" rel="noopener noreferrer" class="social-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </a>
      <a href="https://buymeacoffee.com/pantel" target="_blank" rel="noopener noreferrer" class="social-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
          <line x1="6" y1="1" x2="6" y2="4"></line>
          <line x1="10" y1="1" x2="10" y2="4"></line>
          <line x1="14" y1="1" x2="14" y2="4"></line>
        </svg>
      </a>
    </div>
    <div class="border"></div>
    <p class="version">${translations.configPage.version}: ${manifest.version}</p>

  </div>
  
  <script>
    // Use the ClientLogger from the shared package
    // Define a simple client-side logger
    const logger = {
      error: (message, ...args) => console.error('[Easynews++]', message, ...args),
      warn: (message, ...args) => console.warn('[Easynews++]', message, ...args),
      info: (message, ...args) => console.log('[Easynews++]', message, ...args),
      debug: (message, ...args) => console.log('[Easynews++]', message, ...args),
      silly: (message, ...args) => console.log('[Easynews++]', message, ...args)
    };
    
    // Store the current language for debugging
    const currentLanguage = "${defaultUILanguage}";
    logger.debug("Page loaded with language:", currentLanguage);
    
    // Store translations in JS for debugging
    const pageTranslations = {
      copyConfig: "${translations.configPage.copyConfig}",
      addToStremio: "${translations.configPage.addToStremio}",
      configCopied: "${translations.configPage.configCopied}",
      version: "${translations.configPage.version}"
    };
    logger.debug("Translations loaded:", pageTranslations);
    
    const configForm = document.getElementById('configForm');
    const installLink = document.getElementById('installLink');
    const copyButton = document.getElementById('copyButton');
    const tooltip = document.getElementById('tooltip');
    
    function updateLink() {
      const formData = new FormData(configForm);
      const config = {};
      
      for (const [key, value] of formData.entries()) {
        config[key] = value;
      }
      
      // Handle checkboxes that might not be in formData when unchecked
      document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        if (!formData.has(checkbox.name)) {
          config[checkbox.name] = 'false';
        }
      });
      
      // Create the stremio:// URL
      installLink.href = 'stremio://' + window.location.host + '/' + encodeURIComponent(JSON.stringify(config)) + '/manifest.json';
      copyButton.href = 'https://' + window.location.host + '/' + encodeURIComponent(JSON.stringify(config)) + '/manifest.json';
    }
    
    // Extract the language change handler to a named function
    function handleLanguageChange() {
      // Get the current form values
      const formData = new FormData(configForm);
      const config = {};
      
      // Handle all form fields including checkboxes
      document.querySelectorAll('input, select').forEach(field => {
        if (field.type === 'checkbox') {
          config[field.name] = field.checked ? 'true' : 'false';
        } else {
          config[field.name] = field.value;
        }
      });
      
      // Store the current form values
      localStorage.setItem('formValues', JSON.stringify(config));
      
      // Reload with the new language parameter
      const newLang = this.value;
      logger.info('Language change requested to:', newLang, 'from:', '${defaultUILanguage}');
      
      // Always use the full URL to ensure proper navigation
      const baseUrl = window.location.pathname;
      // Add cache breaker to force the browser to get a fresh page
      const newUrl = baseUrl + '?lang=' + newLang + '&cache=' + new Date().getTime();
      logger.debug('Navigating to:', newUrl);
      
      // Force navigation to the new URL
      window.location.href = newUrl;
    }
    
    // Update when form changes
    configForm.addEventListener('change', function(event) {
      // Only update links when the language isn't changing
      if (event.target.id !== 'uiLanguage') {
        updateLink();
      }
    });
    
    // Initialize on load
    document.addEventListener('DOMContentLoaded', function() {
      // Log the current URL and form values for debugging
      logger.debug('Current URL:', window.location.href);
      logger.debug('Form has language selector:', !!document.getElementById('uiLanguage'));
    
      // Set up language selector
      const uiLanguageSelect = document.getElementById('uiLanguage');
      if (uiLanguageSelect) {
        logger.debug('Language selector found with value:', uiLanguageSelect.value);
        // Remove any existing event listeners
        uiLanguageSelect.removeEventListener('change', handleLanguageChange);
        // Add event listener
        uiLanguageSelect.addEventListener('change', handleLanguageChange);
      }
      
      // Update links initially
      updateLink();
      
      // Restore form values if returning from a language change
      const savedValues = localStorage.getItem('formValues');
      if (savedValues) {
        try {
          const values = JSON.parse(savedValues);
          logger.debug('Restoring saved values:', values);
          
          // Fill in the form
          Object.entries(values).forEach(([key, value]) => {
            const field = document.getElementById(key) || document.querySelector('input[name="' + key + '"]');
            if (field) {
              if (field.type === 'checkbox') {
                field.checked = value === 'true';
              } else {
                field.value = value;
              }
            }
          });
          
          // Clear the saved values
          localStorage.removeItem('formValues');
          
          // Update links with restored values
          updateLink();
        } catch (e) {
          logger.error('Error restoring saved values:', e);
          localStorage.removeItem('formValues');
        }
      }
    });
    
    // "Save Configuration" Button functionality
    installLink.addEventListener('click', function(e) {
      if (!configForm.reportValidity()) {
        e.preventDefault();
      }
    });
    
    // Copy Link Button functionality
    copyButton.addEventListener('click', function() {
      updateLink(); // Ensure the link is up to date
      
      // Create a temporary input element to copy from
      const tempInput = document.createElement('input');
      tempInput.value = copyButton.href;
      document.body.appendChild(tempInput);
      
      // Select and copy the text
      tempInput.select();
      document.execCommand('copy');
      
      // Remove the temporary element
      document.body.removeChild(tempInput);
      
      // Show tooltip
      tooltip.style.opacity = '1';
      
      // Hide tooltip after 2 seconds
      setTimeout(() => {
        tooltip.style.opacity = '0';
      }, 2000);
    });
  </script>
</body>
</html>
`;
}

export default landingTemplate;
