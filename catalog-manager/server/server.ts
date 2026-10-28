import express from 'express';
import { createApp, analytics, server } from '@databricks/appkit';
import { setupCatalogRoutes } from './catalog.js';
import { setupGenieOneRoutes } from './genie-one.js';

createApp({
  plugins: [analytics(), server()],
  async onPluginsReady(appkit) {
    appkit.server.extend((app) => {
      setupGenieOneRoutes(app);
      app.use('/api/catalog', express.json());
      app.use('/api/glossary', express.json());
      void setupCatalogRoutes(app).catch((e) => console.error('catalog setup failed', e));
    });
  },
}).catch(console.error);
