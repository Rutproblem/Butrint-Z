# Project Notes

- Keep the app in plain JavaScript with React Native and Expo; do not introduce TypeScript or Vite.
- Keep the project educational. Purchases are recorded in MySQL but no real payment is processed.
- All book and order operations must go through `src/services/booksApi.js` and the PHP/MySQL REST API; do not add an in-memory fallback.