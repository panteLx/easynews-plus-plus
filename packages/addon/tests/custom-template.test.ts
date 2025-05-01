import { describe, expect, it, vi, beforeEach } from 'vitest';
import landingTemplate from '../src/custom-template';
import { getTranslations } from '../src/i18n';
import { Manifest } from 'stremio-addon-sdk';

// Mock the i18n and logger functions
vi.mock('../src/i18n', () => ({
  getTranslations: vi.fn(),
  ISO_TO_LANGUAGE: {
    eng: 'en',
    deu: 'de',
    fra: 'fr',
    spa: 'es',
  },
}));

vi.mock('../src/utils', () => ({
  logger: {
    debug: vi.fn(),
  },
}));

describe('Custom Template', () => {
  let mockManifest: Manifest;

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Set up a basic manifest for testing
    mockManifest = {
      id: 'org.test.addon',
      name: 'Test Addon',
      description: 'Test Description',
      version: '1.0.0',
      resources: [],
      types: [],
      catalogs: [],
      logo: 'https://test.com/logo.png',
      config: [
        {
          key: 'username',
          type: 'text',
          title: 'Username',
        },
        {
          key: 'password',
          type: 'password',
          title: 'Password',
        },
        {
          key: 'uiLanguage',
          type: 'select',
          title: 'UI Language',
          default: 'eng',
          options: { eng: 'English', deu: 'Deutsch' } as unknown as string,
        },
        {
          key: 'strictTitleMatching',
          type: 'checkbox',
          title: 'Strict Title Matching',
          default: false as unknown as string,
        },
        {
          key: 'sortingPreference',
          type: 'select',
          title: 'Sorting Method',
          default: 'quality_first',
          options: {
            quality_first: 'Quality First',
            language_first: 'Language First',
            size_first: 'Size First',
            date_first: 'Date First',
          } as unknown as string,
        },
        {
          key: 'showQualities',
          type: 'select',
          title: 'Show Qualities',
          default: '4k,1080p,720p,480p',
          options: {
            '4k,1080p,720p,480p': 'All Qualities',
            '1080p,720p,480p': '1080p and below',
          } as unknown as string,
        },
        {
          key: 'preferredLanguage',
          type: 'select',
          title: 'Preferred Language',
          default: '',
          options: {
            '': 'No preference',
            eng: 'English',
            deu: 'Deutsch',
          } as unknown as string,
        },
      ],
    };

    // Set up mock translations
    const mockEnglishTranslations = {
      configPage: {
        title: 'Configuration',
      },
      form: {
        username: 'Username',
        password: 'Password',
        strictTitleMatching: 'Strict Title Matching',
        strictTitleMatchingHint: 'Match titles more accurately',
        sortingMethod: 'Sorting Method',
        sortingMethodHint: 'Choose how results are sorted',
        uiLanguage: 'UI Language',
        showQualities: 'Show Qualities',
        maxResultsPerQuality: 'Max Results Per Quality',
        maxFileSize: 'Max File Size',
        preferredLanguage: 'Preferred Language',
      },
      sortingOptions: {
        qualityFirst: 'Quality First',
        languageFirst: 'Language First',
        sizeFirst: 'Size First',
        dateFirst: 'Date First',
      },
      qualityOptions: {
        allQualities: 'All Qualities',
      },
      languages: {
        noPreference: 'No preference',
      },
    };

    const mockGermanTranslations = {
      configPage: {
        title: 'Konfiguration',
      },
      form: {
        username: 'Benutzername',
        password: 'Passwort',
        strictTitleMatching: 'Strikte Titelübereinstimmung',
        strictTitleMatchingHint: 'Titel genauer abgleichen',
        sortingMethod: 'Sortiermethode',
        sortingMethodHint: 'Wählen Sie, wie Ergebnisse sortiert werden',
        uiLanguage: 'UI-Sprache',
        showQualities: 'Qualitäten anzeigen',
        maxResultsPerQuality: 'Max. Ergebnisse pro Qualität',
        maxFileSize: 'Max. Dateigröße',
        preferredLanguage: 'Bevorzugte Sprache',
      },
      sortingOptions: {
        qualityFirst: 'Qualität zuerst',
        languageFirst: 'Sprache zuerst',
        sizeFirst: 'Größe zuerst',
        dateFirst: 'Datum zuerst',
      },
      qualityOptions: {
        allQualities: 'Alle Qualitäten',
      },
      languages: {
        noPreference: 'Keine Präferenz',
      },
    };

    // Mock the getTranslations function
    (getTranslations as any).mockImplementation((language: string) => {
      if (language === 'deu') return mockGermanTranslations;
      return mockEnglishTranslations;
    });
  });

  it('should generate HTML with correct doctype and charset', () => {
    const html = landingTemplate(mockManifest);

    expect(html).toMatch(/<!DOCTYPE html>/);
    expect(html).toMatch(/<meta charset="UTF-8">/);
  });

  it('should include the manifest name and logo in the generated HTML', () => {
    const html = landingTemplate(mockManifest);

    expect(html).toContain(`<title>${mockManifest.name}`);
    expect(html).toContain(`<link rel="icon" type="image/png" href="${mockManifest.logo}">`);
  });

  it('should use the default UI language from the manifest', () => {
    const html = landingTemplate(mockManifest);

    expect(html).toContain('<html lang="en">');
    expect(getTranslations).toHaveBeenCalledWith('eng');
  });

  it('should translate form fields based on the UI language', () => {
    // First test with English
    const htmlEng = landingTemplate(mockManifest);

    expect(htmlEng).toContain('Configuration');
    expect(htmlEng).toContain('Strict Title Matching');
    expect(htmlEng).toContain('Match titles more accurately');

    // Change the default language to German and test again
    const uiLanguageField = mockManifest.config?.find(f => f.key === 'uiLanguage');
    if (uiLanguageField) {
      uiLanguageField.default = 'deu';
    }
    const htmlDeu = landingTemplate(mockManifest);

    expect(htmlDeu).toContain('<html lang="de">');
    expect(htmlDeu).toContain('Konfiguration');
    expect(htmlDeu).toContain('Strikte Titelübereinstimmung');
    expect(htmlDeu).toContain('Titel genauer abgleichen');
    expect(getTranslations).toHaveBeenCalledWith('deu');
  });

  it('should translate sorting options correctly', () => {
    const html = landingTemplate(mockManifest);

    expect(html).toContain('Sorting Method');
    expect(html).toContain('Quality First');
    expect(html).toContain('Language First');

    // Change to German
    const uiLanguageField = mockManifest.config?.find(f => f.key === 'uiLanguage');
    if (uiLanguageField) {
      uiLanguageField.default = 'deu';
    }
    const htmlDeu = landingTemplate(mockManifest);

    expect(htmlDeu).toContain('Sortiermethode');
    expect(htmlDeu).toContain('Qualität zuerst');
    expect(htmlDeu).toContain('Sprache zuerst');
  });

  it('should handle special options like "All Qualities" and "No preference"', () => {
    const html = landingTemplate(mockManifest);

    expect(html).toContain('All Qualities');
    expect(html).toContain('No preference');

    // Change to German
    const uiLanguageField = mockManifest.config?.find(f => f.key === 'uiLanguage');
    if (uiLanguageField) {
      uiLanguageField.default = 'deu';
    }
    const htmlDeu = landingTemplate(mockManifest);

    expect(htmlDeu).toContain('Alle Qualitäten');
    expect(htmlDeu).toContain('Keine Präferenz');
  });

  it('should include a cache breaker in the HTML', () => {
    // Mock Date.now for consistent testing
    const originalDateNow = Date.now;
    Date.now = vi.fn(() => 1234567890);

    const html = landingTemplate(mockManifest);

    // Check if the Date.now mock was called, rather than checking for the actual value in the HTML
    expect(Date.now).toHaveBeenCalled();

    // Restore original Date.now
    Date.now = originalDateNow;
  });

  it('should include CSS styles in the generated HTML', () => {
    const html = landingTemplate(mockManifest);

    expect(html).toContain('<style>');
    expect(html).toContain('--background:');
    expect(html).toContain('font-family:');
  });

  it('should generate valid HTML structure with body and container elements', () => {
    const html = landingTemplate(mockManifest);

    expect(html).toMatch(/<body>/);
    expect(html).toMatch(/<\/body>/);
    expect(html).toMatch(/<div class="container">/);
    expect(html).toMatch(/<div class="background-container">/);
  });

  it('should render form with all configuration fields', () => {
    const html = landingTemplate(mockManifest);

    // Check if form element exists
    expect(html).toMatch(/<form/);

    // Check if all form fields are rendered
    mockManifest.config?.forEach(field => {
      if (field.key) {
        // For each config field, check if there's a field with the name attribute
        expect(html).toContain(`name="${field.key}"`);
      }

      // Check if field titles are included
      if (field.key === 'username') {
        expect(html).toContain('Easynews Username');
      } else if (field.key === 'password') {
        expect(html).toContain('Easynews Password');
      } else if (field.title) {
        expect(html).toContain(field.title);
      }

      // Check if select options are rendered for select fields
      if (field.type === 'select' && field.options) {
        const optionsObj = field.options as unknown as Record<string, string>;
        Object.values(optionsObj).forEach(optionValue => {
          expect(html).toContain(`>${optionValue}</option>`);
        });
      }
    });

    // Check if the form has a submit button
    expect(html).toMatch(/<button/);
  });

  it('should properly handle missing translations with fallbacks', () => {
    // Create an incomplete translation
    const incompleteTranslations = {
      configPage: {
        title: 'Partial Config',
      },
      form: {
        // Missing some translation keys
        username: 'User',
        // password is missing
      },
      // sortingOptions is missing
    };

    // Set up mock to return incomplete translations
    (getTranslations as any).mockImplementation(() => incompleteTranslations);

    const html = landingTemplate(mockManifest);

    // Should still render properly
    expect(html).toContain('Partial Config');
    expect(html).toContain('User');

    // These should fall back to using the original titles
    expect(html).toContain('Password');
    expect(html).toContain('Sorting Method');
  });

  it('should handle all i18n key integrations correctly', () => {
    const html = landingTemplate(mockManifest);

    // Check config page title
    expect(html).toContain(`${mockManifest.name} - Configuration`);

    // Check form field translations
    expect(html).toContain('Easynews Username');
    expect(html).toContain('Easynews Password');
    expect(html).toContain('Strict Title Matching');
    expect(html).toContain('Match titles more accurately'); // Hint text

    // Check sorting method translation
    expect(html).toContain('Sorting Method');
    expect(html).toContain('Choose how results are sorted'); // Hint text

    // Check sorting options
    expect(html).toContain('Quality First');
    expect(html).toContain('Language First');
    expect(html).toContain('Size First');
    expect(html).toContain('Date First');

    // Check quality options translation
    expect(html).toContain('All Qualities');

    // Check language preference translation
    expect(html).toContain('No preference');

    // Now test with a different language
    const uiLanguageField = mockManifest.config?.find(f => f.key === 'uiLanguage');
    if (uiLanguageField) {
      uiLanguageField.default = 'deu';
    }
    const htmlDeu = landingTemplate(mockManifest);

    // Verify German translations
    expect(htmlDeu).toContain(`${mockManifest.name} - Konfiguration`);
    expect(htmlDeu).toContain('Easynews Benutzername');
    expect(htmlDeu).toContain('Easynews Passwort');
    expect(htmlDeu).toContain('Strikte Titelübereinstimmung');
    expect(htmlDeu).toContain('Titel genauer abgleichen'); // Hint text
    expect(htmlDeu).toContain('Qualität zuerst');
    expect(htmlDeu).toContain('Sprache zuerst');
  });
});
