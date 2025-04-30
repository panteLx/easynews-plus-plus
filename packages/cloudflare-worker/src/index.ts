import { Hono } from 'hono';
import { getRouter } from 'hono-stremio';
import { addonInterface, customTemplate } from 'easynews-plus-plus-addon';
import { getUILanguage } from 'easynews-plus-plus-addon/dist/i18n';

// Create the router with the default HTML
console.debug('Initializing Cloudflare Worker with addon interface');
const defaultHTML = customTemplate(addonInterface.manifest);
console.debug(`Generated default HTML template (${defaultHTML.length} bytes)`);
const addonRouter = getRouter(addonInterface, { landingHTML: defaultHTML });
console.debug('Created Stremio router with addon interface');

const app = new Hono();
console.debug('Initialized Hono app');

// Helper function to create a deep clone of the manifest with a specified language
function createManifestWithLanguage(lang: string) {
  console.debug(`Creating manifest clone for language: ${lang}`);
  const manifest = structuredClone(addonInterface.manifest);

  // Find and update the uiLanguage field
  if (manifest.config) {
    const uiLangFieldIndex = manifest.config.findIndex((field: any) => field.key === 'uiLanguage');
    if (uiLangFieldIndex >= 0 && lang) {
      console.log(`Setting language in manifest to: ${lang}`);
      manifest.config[uiLangFieldIndex].default = lang;
      console.debug(`Updated manifest language setting to: ${lang}`);
    } else {
      console.debug(`No uiLanguage field found in manifest config or empty language`);
    }
  } else {
    console.debug('No config found in manifest');
  }

  return manifest;
}

// Add the configure route for direct access with language selection
app.get('/configure', c => {
  console.debug(`Received configure request from: ${c.req.header('user-agent')}`);

  // Set no-cache headers
  c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  c.header('Pragma', 'no-cache');
  c.header('Expires', '0');

  const lang = c.req.query('lang') || '';
  const uiLanguage = getUILanguage(lang);

  console.log(
    `Cloudflare worker: Received request with lang=${lang}, using UI language ${uiLanguage}`
  );

  // Generate new HTML with the selected language
  let tempManifest;

  // If a language is specified, create a specialized manifest for that language
  if (lang) {
    console.debug(`Creating customized manifest for language: ${lang}`);
    tempManifest = createManifestWithLanguage(lang);
  } else {
    // Otherwise, use the default manifest
    console.debug('Using default manifest (no language specified)');
    tempManifest = addonInterface.manifest;
  }

  // Generate new HTML with the updated language
  console.debug('Generating HTML with localized template');
  const localizedHTML = customTemplate(tempManifest);
  console.debug(`Generated localized HTML (${localizedHTML.length} bytes)`);
  return c.html(localizedHTML);
});

// If we have a config, add a redirect from the root to configure
if ((addonInterface.manifest.config || []).length > 0) {
  console.debug('Addon has configuration, setting up root redirect');
  app.get('/', c => {
    console.debug(`Received root request from: ${c.req.header('user-agent')}`);

    // Pass any language parameter to the configure route
    const lang = c.req.query('lang') || '';
    const redirectUrl = lang ? `/configure?lang=${lang}` : '/configure';
    console.log(`Cloudflare worker: Redirecting to ${redirectUrl}`);
    return c.redirect(redirectUrl);
  });
} else {
  console.debug('Addon has no configuration, keeping default root route');
}

app.route('/', addonRouter);
console.debug('Router setup complete, Cloudflare Worker initialized');

export default app;
