import { Hono } from 'hono';
import { getRouter } from 'hono-stremio';
import { addonInterface, landingHTML } from '@easynews-plus-plus/addon';

const addonRouter = getRouter(addonInterface, { landingHTML });

const app = new Hono();

app.route('/', addonRouter);

export default app;
