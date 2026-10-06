const { getDefaultConfig } = require('expo/metro-config');
const { createDevApiProxy } = require('./scripts/dev-api-proxy.cjs');
const config = getDefaultConfig(__dirname);
const previous = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const next = previous ? previous(middleware, server) : middleware;
  return createDevApiProxy(process.env.EXPO_PUBLIC_API_BASE_URL, next);
};
module.exports = config;
