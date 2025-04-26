import { Hono } from 'hono';
import { getRouter } from 'hono-stremio';
import { addonInterface, customTemplate } from 'easynews-plus-plus-addon';
import { getUILanguage } from 'easynews-plus-plus-addon/dist/i18n';

// Create the router with the default HTML
const defaultHTML = customTemplate(addonInterface.manifest);
const addonRouter = getRouter(addonInterface, { landingHTML: defaultHTML });

const app = new Hono();

// Helper function to create a deep clone of the manifest with a specified language
function createManifestWithLanguage(lang: string) {
  const manifest = structuredClone(addonInterface.manifest);

  // Find and update the uiLanguage field
  if (manifest.config) {
    const uiLangFieldIndex = manifest.config.findIndex((field: any) => field.key === 'uiLanguage');
    if (uiLangFieldIndex >= 0 && lang) {
      console.log(`Setting language in manifest to: ${lang}`);
      manifest.config[uiLangFieldIndex].default = lang;
    }
  }

  return manifest;
}

// Add the configure route for direct access with language selection
app.get('/configure', c => {
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
    tempManifest = createManifestWithLanguage(lang);
  } else {
    // Otherwise, use the default manifest
    tempManifest = addonInterface.manifest;
  }

  // Generate new HTML with the updated language
  const localizedHTML = customTemplate(tempManifest);
  return c.html(localizedHTML);
});

// If we have a config, add a redirect from the root to configure
if ((addonInterface.manifest.config || []).length > 0) {
  app.get('/', c => {
    // Pass any language parameter to the configure route
    const lang = c.req.query('lang') || '';
    const redirectUrl = lang ? `/configure?lang=${lang}` : '/configure';
    console.log(`Cloudflare worker: Redirecting to ${redirectUrl}`);
    return c.redirect(redirectUrl);
  });
}

app.route('/', addonRouter);

export default app;
