// Shared constants and pure utils for web + server.
// Keep this dependency-free and environment-agnostic (no DOM, no Node APIs).

export const APP_NAME = 'SingTech AI';
export const SERVICE_NAME = 'singtech-api';
export const API_PREFIX = '/api';
export const DEFAULT_API_PORT = 8787;

// Account Intelligence module constants (products, health bands, actions, markets).
export * from './account-intelligence.js';
