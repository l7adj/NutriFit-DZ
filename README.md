# NutriFit DZ

A science-led, made-to-order sports nutrition platform for Algeria.

> Product principle: calculate first, prepare only after a confirmed order. Meals are not pre-cooked or stocked.

## Current status

**Foundation / MVP scaffold.** The repository is being built in small, auditable stages. Scientific calculations must be deterministic, versioned, source-attributed, and covered by tests before they are used for customer orders.

## Product scope

- Arabic RTL-first customer experience, with room for French and English.
- DZD pricing and Africa/Algiers timezone.
- Customer profile, measurements, goal and activity inputs.
- Evidence-based energy and macronutrient calculation.
- Food composition records with provenance and preparation state.
- Pre-orders for next-day preparation and delivery.
- Admin workflow for reviewing orders and approving sensitive adjustments.
- Online operation with explicitly designed offline-tolerant customer flows.
- Cash on delivery in the initial release; no payment gateway in v1.

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/SCIENTIFIC_RULES.md](docs/SCIENTIFIC_RULES.md), and [docs/ROADMAP.md](docs/ROADMAP.md).

Planned stack: Next.js App Router + TypeScript, PostgreSQL + Prisma, shared deterministic nutrition/pricing/order packages, and a separate admin application.

## Non-negotiable engineering rules

1. Never display a scientific number without its classification and source.
2. Never silently substitute missing or low-confidence measurements.
3. Never change a customer's target automatically from a calibration signal; present a proposal for approval.
4. Keep theoretical raw ingredient quantity separate from operational waste.
5. Preserve calculation inputs, formula versions, source versions, and outputs for audit.
6. Do not infer PAL from training days alone.
7. No meal preparation before an accepted order.

## Local preview

Open `preview/index.html` directly in a browser. It is a static UI concept and does not perform production nutrition calculations or accept real orders.

## Development

The production app scaffold will be added in the next implementation stages. Do not treat the static preview as a live ordering system.
