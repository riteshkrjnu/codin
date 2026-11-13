export function databaseConfig(env = process.env) {
  const uri = env.MONGODB_URI?.trim();
  const dbName = env.MONGODB_DB_NAME?.trim();
  if (!uri || !/^mongodb(?:\+srv)?:\/\//.test(uri)) throw new Error('Set a valid MONGODB_URI in the server environment');
  if (!dbName || !/^[a-zA-Z0-9_-]+$/.test(dbName)) throw new Error('MONGODB_DB_NAME is required');
  if (env.NODE_ENV !== 'production' && dbName === 'codin') throw new Error('Development cannot use the production database codin');
  if (env.NODE_ENV === 'production' && dbName !== 'codin') throw new Error('Production must explicitly use MONGODB_DB_NAME=codin');
  return { uri, dbName };
}
export const outboundEnabled = () => process.env.NODE_ENV === 'production' && process.env.OUTBOUND_ENABLED === 'true';

export function hostingConfig(env = process.env) {
  const app = env.APP_URL || 'http://localhost:3000';
  const api = env.PUBLIC_API_URL || app;
  const origins = (env.CORS_ORIGINS || app).split(',').map(value => value.trim()).filter(Boolean);
  for (const raw of [app, api, ...origins]) {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== raw.replace(/\/$/, '') || url.username || url.password) throw new Error('APP_URL, PUBLIC_API_URL and CORS_ORIGINS must be HTTP(S) origins without paths or credentials');
    if (env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new Error('Production frontend and API origins require HTTPS');
  }
  return { app: app.replace(/\/$/, ''), api: api.replace(/\/$/, ''), origins: origins.map(value => value.replace(/\/$/, '')), serveFrontend: env.SERVE_FRONTEND !== 'false' };
}
