# NutriFit DZ — Premium Product Experience Specification

Status: design authority for the redesign branch  
Scope: end-to-end customer, kitchen, operations and delivery experience  
Principle: quiet luxury, scientific transparency, operational clarity

## 1. Product position

NutriFit DZ is a high-touch, made-to-order nutrition service. It is not a calorie tracker, a discount meal marketplace, or a crowded food-delivery catalog. The product should feel closer to a premium hospitality concierge with the rigor of a nutrition platform.

Design priorities, in order:
1. Trust and correctness.
2. Clarity at every decision.
3. Low-friction interaction on a phone.
4. Premium restraint and food appetite appeal.
5. Operational traceability.
6. Delight through feedback and motion, never decoration that slows work.

Do not use popularity, social proof, urgency counters, fake scarcity, invented reviews, or unsupported nutrition claims as persuasion.

## 2. Visual direction

### Brand concept: Modern Nutrition Atelier

Use a warm, tactile, editorial visual language. Avoid the generic black-and-gold luxury cliché and avoid loud fitness neon.

Core palette:
- Porcelain / page: #F5F3ED
- White surface: #FFFEFB
- Ink / primary text: #202722
- Deep evergreen / primary brand: #24483D
- Muted sage / secondary: #87978A
- Soft stone / separators: #E5E1D7
- Brass / restrained accent: #B28A56
- Terracotta / caution: #B86F55
- Success: #47745B
- Critical: #A94F48

Rules:
- Food photography supplies most saturated color.
- Evergreen is for primary actions and selected states, not every panel.
- Brass is a small accent for craft, progress, and premium details; never use it for long body text.
- Red is reserved for destructive or critical states.
- Use warm off-white as the default customer canvas. Dark surfaces may be used selectively for immersive photography or focused dashboards, not as the entire default interface.
- Maintain WCAG AA contrast for text and controls.

### Typography
- Arabic-first typography with a highly legible Arabic sans stack. Prefer a bundled/open-licensed family only after confirming it loads reliably; system fallback must remain excellent.
- Body copy: 15–16px mobile, line-height 1.65–1.75.
- Secondary metadata: never below 12px; critical prices/macros must not be tiny.
- Page title: 26–32px mobile, 34–42px desktop.
- Section title: 18–22px.
- Numeric values use tabular numerals and consistent units.
- Avoid excessive uppercase English labels and letter-spaced decorative microcopy.

### Spacing and geometry
Use a 4px base spacing scale, with 8px as the common rhythm.
- Mobile page gutters: 18–20px; compact minimum 16px.
- Desktop content max width: 1200–1280px.
- Card padding: 18–24px.
- Section spacing: 28–40px.
- Control height: 48–52px minimum.
- Icon-only controls: 48px minimum hit area.
- Card radius: 16–20px; sheets/dialogs: 24px top radius on mobile.
- Borders are subtle; use elevation only to clarify hierarchy.
- Never squeeze important information into narrow 3-column mobile layouts if labels become clipped.

## 3. Motion and interaction language

Motion must explain cause and effect:
- Tap feedback: 100–160ms.
- State transitions: 180–260ms.
- Sheet/modal transitions: 240–320ms with restrained easing.
- Add-to-plan: short visual confirmation, count update, and a clear undo opportunity.
- Changing grams updates nutrition and price immediately, with a subtle number transition; no layout jump.
- Selected cards show a clear border, filled check state and text label; selection must not rely on color alone.
- Loading uses skeletons matching final geometry, not spinners for whole pages.
- Toasts are short, positioned away from the bottom navigation and device gesture area.
- Respect prefers-reduced-motion and provide a fully usable reduced-motion experience.
- Never animate essential content out from under the user's finger.

## 4. Information architecture

Customer navigation has four stable destinations:
1. Today — personal overview, plan status, next delivery and a single primary action.
2. Build plan — meals, food discovery, customization and daily nutrition balance.
3. Orders — order history, current order, delivery status and receipts.
4. Account — profile, health screening, preferences, allergens, addresses and support.

Do not make the cart a competing primary destination. The plan builder owns a persistent, clearly labeled plan summary and a review action. The final review is a distinct step before order confirmation.

Staff experiences are separate role-based workspaces:
- Admin: catalog, evidence/source records, prices, capacity, customers, orders, zones, reporting and audit trail.
- Kitchen: production queue, batch totals, ingredient pick/scale, preparation, packing and handoff.
- Delivery: assigned routes, recipient details, delivery window, status and proof of handoff.

Never expose staff navigation to customers or rely on hidden buttons as authorization. Server-side role checks are mandatory.

## 5. Customer journey and transition contract

### A. First visit
Landing → service explanation → create account / sign in.
Explain what the service does, how food is weighed, how plans are calculated, cutoff times only when configured, and what is not yet available. Do not use a long marketing wall.

### B. Account and suitability
Create account → identity/contact → health and safety screening → profile.
Ask only information needed for the next calculation. Use progressive disclosure. Health flags and allergens must be explicit and reviewable. Do not imply medical diagnosis or treatment.

### C. Nutrition profile
Profile inputs → activity/goal selection → calculation review → save profile.
Show the method, assumptions, units and source confidence. Clearly separate measured facts, formula outputs, reference ranges, operational choices and calibration assumptions (F/R/O/C). Allow back navigation without losing valid input.

### D. Plan builder
Select number of meals → choose meal slot → browse/search/filter foods → inspect item → set grams → add to meal → review meal → repeat → daily plan review.
The builder should preserve context: returning from an item returns to the same meal slot, category, search and scroll position.

### E. Food quantity interaction — critical pattern
On mobile, opening an item launches a bottom sheet with:
1. A compact item identity row and food state (raw/cooked/as sold).
2. A persistent nutrition-and-price summary ABOVE the quantity controls.
3. A large, thumb-friendly grams stepper below that summary.
4. Optional direct numeric entry with unit shown.
5. Portion/source details and allergens in a scrollable content region.
6. A persistent bottom action area with the updated price and “Add to meal”.

The live summary must remain visible while grams are changed. The user's thumb must never cover the only display of price, kcal, protein, carbs or fat. The sheet body may scroll, but summary and primary action stay anchored. On desktop, use a centered side panel with the same hierarchy.

Every gram change must update from the same authoritative calculation:
- displayed grams
- kcal and macros
- price
- meal subtotal
- daily plan totals and remaining target
No optimistic fake values, no delayed stale labels, no silent rounding that changes the selected amount. Define supported increments and bounds per food type. Show raw/cooked basis clearly. Juice/liquid units must not be mislabeled as grams.

### F. Review and order
Daily plan review → nutrition validation → price breakdown → delivery/pickup choice → date/time availability → contact/address confirmation → terms and final confirmation.
Never create a real order until server validation succeeds. Show all fees before confirmation. If the cutoff passes or capacity changes, explain and offer a valid next option rather than silently changing the date.

### G. Order lifecycle
Submitted → awaiting confirmation (if manual review is required) → confirmed → scheduled → in preparation → quality check → packed → handed to delivery / ready for pickup → out for delivery → delivered → closed.
Cancellation, waitlist, failed delivery and refund states must have explicit transitions and reasons. Customer sees plain-language status; staff sees operational detail. The order cannot be marked delivered by the customer UI.

### H. End-of-day and account closure
Daily operations close only after all orders, production quantities, inventory movements, handoffs, exceptions and cash/payment reconciliation are accounted for. Account deletion/export and service shutdown are distinct flows with confirmation, retention policy and audit record. Never erase financial or safety records contrary to legal retention requirements.

## 6. Component standards

- Buttons: one dominant primary action per view; secondary actions outlined or quiet; destructive action separated.
- Inputs: persistent labels, inline validation, clear units and helpful error copy.
- Cards: consistent title, status, metadata and action positions.
- Food cards: appetite-led image, clear name, preparation state, concise description, price basis and verified nutrition status.
- Nutrition: show per-portion and per-100g basis explicitly; never mix them.
- Status: text + icon + color, never color alone.
- Empty states: explain why empty and provide one next action.
- Error states: explain what happened, whether data was saved, and the recovery action.
- Confirmation dialogs: reserve for irreversible or high-impact actions; don't interrupt routine edits.

## 7. Responsive behavior

Mobile-first:
- Single-column reading flow.
- Bottom navigation safe-area aware.
- Sheets respect viewport height and keyboard; inputs remain visible.
- Sticky summary/action bars never overlap content or device controls.
- Touch targets at least 48px with adequate spacing.
- No hover-only affordances.

Tablet:
- Two-column layout only when it improves comparison and keeps actions close to context.

Desktop:
- Wider content with controlled line length.
- Persistent contextual summary where useful.
- Staff dashboards may use tables and multi-column workspaces, with responsive card fallback.

## 8. Accessibility and localization

- Full Arabic RTL, including mixed numerals, currency, dates, icons and directional controls.
- Keyboard navigation and visible focus.
- Semantic headings, labels and button names.
- Contrast target WCAG 2.2 AA.
- Screen-reader announcements for quantity changes and cart/plan updates.
- Reduced-motion support.
- Arabic copy is concise, respectful and operationally clear; no awkward machine-translated strings.
- DZD formatting is consistent and must be based on configured prices.

## 9. Trust, scientific integrity and operational safeguards

- Never present demo seed prices, foods, delivery zones, capacity or cutoff times as live commercial facts.
- A food is not “verified” without a traceable source record and matching preparation basis.
- Keep raw and cooked foods distinct.
- Nutrition and price calculations must have tests and one authoritative source of truth.
- Use F/R/O/C classification for every nutrition number and expose methodology when relevant.
- Revalidate price, allergens, stock, capacity, schedule and user authorization on the server at order submission.
- Use idempotency for order creation; prevent duplicate submissions.
- Maintain audit events for admin changes and order state changes.
- Keep personal health data out of public logs and analytics.

## 10. Quality gates

A phase is not complete until:
- the primary journey can be completed on a narrow mobile viewport;
- all interactive states have loading, success, empty and error handling;
- back navigation preserves context;
- touch targets and sticky regions are checked on an actual phone;
- nutrition and price values match tested calculation functions;
- no demo data is represented as live;
- role boundaries are verified server-side;
- build, typecheck and relevant automated tests pass.

Release is blocked by white screens, broken routes, inaccessible controls, stale price/nutrition totals, duplicate orders, unverified live catalog data, or an unconfigured production backend.

## 11. Research references informing this specification

- Baymard Institute, Food Delivery & Takeout UX research: https://baymard.com/research/online-food-delivery
- Baymard Institute, Food Delivery UX research and audit coverage: https://baymard.com/industries/food-delivery-and-takeout-ux
- Sakara app case study, calendar-led meal plans and swap flows: https://fueled.com/work/sakara/
- Toptal, food app design: imagery, simplicity and visual hierarchy: https://www.toptal.com/designers/ux/food-app-design

These references inform patterns and evaluation criteria; NutriFit's interface must be designed around its own gram-based nutrition and kitchen workflow, not copied from a competitor.
