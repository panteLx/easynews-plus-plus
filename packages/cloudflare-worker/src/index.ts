import { Hono } from 'hono';
import { getRouter } from 'hono-stremio';
import { addonInterface, landingHTML } from '@easynews-plus-plus/addon';

const addonRouter = getRouter(addonInterface, { landingHTML });

const app = new Hono();

// Add the configure route for direct access
app.get('/configure', (c) => {
  return c.html(landingHTML);
});

// If we have a config, add a redirect from the root to configure
if ((addonInterface.manifest.config || []).length > 0) {
  app.get('/', (c) => {
    return c.redirect('/configure');
  });
}

app.route('/', addonRouter);

export default app;
