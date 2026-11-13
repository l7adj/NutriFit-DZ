# Atelier Ceramic redesign status

This branch contains a customer experience rebuild, not a production release.

## Implemented
- Light-first semantic design tokens and user-selectable dark theme.
- Shared motion language and accessible UI primitives.
- Nutrition-first Today dashboard.
- Three-step meal builder using the existing nutrition calculation and allergen validation utilities.
- Cart surface migration while preserving existing server-side order submission and validation logic.
- Route transition choreography.
- Removed obsolete customer menu implementations.

## Verification gate
Do not merge until TypeScript, unit tests, mobile/desktop interaction review, and API-backed order flow are verified. Cloudflare Pages preview success only confirms the static frontend build; it does not validate the backend, database, nutrition data governance, pricing, delivery capacity, or real order operations.
