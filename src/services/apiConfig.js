export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || '').trim().replace(/\/$/, '');

export const isApiConfigured = API_BASE_URL.length > 0;