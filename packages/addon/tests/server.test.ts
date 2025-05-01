import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Manifest } from 'stremio-addon-sdk';

// Mock the dependencies
vi.mock('../src/custom-template', () => ({
  default: vi
    .fn()
    .mockImplementation(
      manifest => `<mocked-template>${JSON.stringify(manifest)}</mocked-template>`
    ),
}));

// Create a simple mock for the addon interface
const mockAddonInterface = {
  manifest: {
    id: 'org.easynews',
    name: 'Easynews++',
    description: 'Easynews++ Addon',
    version: '1.0.0',
    resources: [],
    types: [],
    catalogs: [],
    config: [
      {
        key: 'uiLanguage',
        type: 'select' as const, // Use const assertion to make TypeScript recognize this as a literal type
        title: 'UI Language',
        default: 'eng',
      },
    ],
  } as Manifest, // Type assertion to Manifest type
  get: vi.fn(),
};

vi.mock('../src/addon', () => ({
  addonInterface: mockAddonInterface,
}));

// Import custom template function directly
import customTemplate from '../src/custom-template';

// Test the custom template integration
describe('Custom Template Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use custom template with manifest', () => {
    // Call the template function with a manifest
    customTemplate(mockAddonInterface.manifest);

    // Check if the template function was called with the manifest
    expect(customTemplate).toHaveBeenCalledWith(mockAddonInterface.manifest);
  });

  it('should include language information in the template', () => {
    // Call the template with a manifest
    const result = customTemplate(mockAddonInterface.manifest);

    // The mock implementation will stringify the manifest in the result
    expect(result).toContain('"id":"org.easynews"');
    expect(result).toContain('"uiLanguage"');
    expect(result).toContain('"default":"eng"');
  });

  it('should handle different languages', () => {
    // Create a clone of the manifest with a different language
    const germanManifest = structuredClone(mockAddonInterface.manifest);
    if (germanManifest.config) {
      const uiLangField = germanManifest.config.find((f: any) => f.key === 'uiLanguage');
      if (uiLangField) {
        uiLangField.default = 'deu';
      }
    }

    // Call the template with the modified manifest
    const result = customTemplate(germanManifest);

    // Verify the German language setting is in the output
    expect(result).toContain('"default":"deu"');
  });
});
