# Architecture

## System boundaries

- **Customer app**: onboarding, profile, nutrition plan, menu selection, preorder status.
- **Admin app**: food catalogue, source review, recipe composition, order queue, production sheets, delivery status.
- **Nutrition domain**: pure deterministic functions. No database or UI dependencies.
- **Food domain**: composition values, source provenance, edible portion, preparation state, yield and nutrient retention.
- **Pricing domain**: ingredient cost, packaging, labour and delivery pricing; commercial values are not scientific facts.
- **Orders domain**: immutable order snapshot, confirmation, next-day production queue and status transitions.
- **Database package**: Prisma schema, migrations and seed data.

## Data flow

1. Customer enters profile and goal data.
2. Server validates units, plausibility and required evidence.
3. Nutrition engine calculates RMR, estimated energy expenditure and macro targets using versioned rules.
4. Customer reviews the plan; the system records the exact inputs, formula version and source versions.
5. Customer selects meals and submits a preorder.
6. Admin confirms availability and order. Only confirmed orders enter the next-day production queue.
7. Kitchen receives ingredient quantities and preparation instructions. Raw requirement, cooked yield and operational waste remain separate.

## Reliability and offline behaviour

- The browser may cache static shell assets and the last explicitly saved plan.
- Order creation, target recalculation, stock confirmation and admin actions require server confirmation.
- Offline actions are queued only when they are idempotent and safe; never show an unconfirmed order as accepted.
- Every sync operation carries an idempotency key and server timestamp.

## Security

- Authenticated server-side authorization for customer/admin boundaries.
- HttpOnly secure session cookies; password hashes use bcrypt or an equivalent adaptive hash.
- Validate all user inputs on the server.
- Do not expose internal food costs, source notes or admin-only data to customers.
- Audit sensitive edits and approvals.
- Backups are encrypted, automated and periodically restore-tested.

## Deployment target

Dockerized Next.js services behind Nginx, PostgreSQL 16, persistent object storage for food imagery, daily database backups, TLS, health checks and structured logs.
