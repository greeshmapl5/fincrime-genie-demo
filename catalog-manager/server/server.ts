import express from 'express';
import { createApp, analytics, genie, server } from '@databricks/appkit';
import { setupCatalogRoutes } from './catalog.js';

createApp({
  plugins: [analytics(), genie(), server()],
  async onPluginsReady(appkit) {
    appkit.server.extend((app) => {
      app.use('/api/catalog', express.json());
      app.use('/api/glossary', express.json());
      void setupCatalogRoutes(app).catch((e) => console.error('catalog setup failed', e));
    });
  },
}).catch(console.error);
