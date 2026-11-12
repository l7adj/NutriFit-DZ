# Scientific rules — v1.0

This document is the calculation contract. It distinguishes evidence-based formulae from configurable operational assumptions.

## Value classifications

- **F — Formula**: published equation or method.
- **R — Range**: evidence-supported interval, not a universal point value.
- **O — Operational**: product or workflow default that an authorized operator may configure.
- **C — Calibration**: individualized adjustment proposed from observed trends and requiring customer approval.

Every displayed numeric target must retain its classification, unit, source/version and effective date.

## Energy

- Resting metabolic rate: Mifflin–St Jeor (1990) as the default formula.
- Katch–McArdle may be offered only when fat-free mass comes from a documented, sufficiently reliable measurement. Store device, date, conditions and measurement provenance.
- Total daily energy expenditure uses an activity factor (PAL) with a documented rationale. PAL must not be inferred from training days alone.
- Any default PAL is an operational starting point, not a diagnosis or measured fact.
- Goal surplus/deficit is a customer-adjustable operational input; do not present it as a scientifically mandatory fixed value.

## Calibration

Use repeated body-weight observations and a rolling 7-day average where enough measurements exist. A trend may trigger a review suggestion, never an automatic target change. Before proposing a change, consider adherence, measurement consistency, hydration, glycogen, menstrual-cycle effects where relevant, and the observation window. Customer approval is required.

## Macronutrients

- Protein ranges are goal- and context-dependent. Use ISSN (2017) and Helms et al. (2014) as the evidence basis. Distinguish total-body-mass prescriptions from fat-free-mass prescriptions; use the latter only with reliable LBM.
- Per-meal protein guidance may use 0.25–0.40 g/kg or approximately 20–40 g as a range, with roughly 3–4 hours between protein-containing meals as guidance, not a hard requirement.
- Fat: IOM DRI (2005) adult AMDR 20–35% of energy; 25% may be an operational default.
- Carbohydrate is calculated from remaining energy after protein and fat. Evidence ranges are warnings/context, not automatic overrides.
- Fibre: at least 25 g/day for adults as a general reference (WHO 2023); individual tolerance and clinical context matter.

## Food composition and energy reconciliation

Supported energy provenance types: PUBLISHED, ATWATER_GENERAL, ATWATER_SPECIFIC and MIXED. Do not reject a food record merely because its published energy differs from a naive 4/4/9 reconstruction. Preserve the source's energy method and report discrepancies for review.

Food source hierarchy is contextual, not automatic: USDA FoodData Central, Ciqual, FAO/INFOODS, official manufacturer labels and laboratory analysis may be used. Choose the best match for the actual food, state and preparation.

## Food reliability

A reliability score must be explainable and reproducible. Candidate dimensions: source quality (30%), food match (25%), data completeness (20%), preparation-state precision (15%), freshness (10%). Scores must be versioned; do not imply statistical certainty.

## Preparation and yield

Store raw/cooked yield factor per food and preparation method. Store nutrient retention separately where data exists. Do not add an automatic waste percentage to scientific ingredient requirements. Keep:
- theoretical edible raw requirement;
- preparation yield and cooked output;
- operational waste allowance, if configured by the kitchen.

## Supplements

The platform may provide informational recommendations but does not sell supplements in v1. Enforce the configured maximum supplement-derived protein share (initial product cap: 50%) server-side and display the assumption clearly. Do not present supplements as required.

## Source register to seed and verify

- Mifflin et al. (1990), resting energy expenditure equation.
- FAO/WHO/UNU (2004), human energy requirements and PAL framework.
- ISSN position stand (2017), protein and exercise.
- Helms et al. (2014), evidence-based recommendations for natural bodybuilding contest preparation.
- IOM (2005), Dietary Reference Intakes for energy/macronutrients.
- ACSM et al. (2016), nutrition and athletic performance.
- WHO (2023), carbohydrate intake / dietary fibre guidance.

Bibliographic metadata, DOI/URL, exact editions and licensed source excerpts must be verified before production use. This seed document is not a substitute for source verification.
