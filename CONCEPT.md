# donebell — balanced dumbbell plate planner

## Goal
Single-page, browser-only helper that turns a user’s plate inventory into printable cheat sheets for configuring balanced dumbbells without in-set arithmetic.

## Users & context
- Home/garage lifters with limited plate sets who want quick lookup tables during workouts.
- Works offline after load; no accounts or server.

## Data & inputs
- Unit: kilograms only.
- Plate inventory: weight (kg, whole or decimal) + quantity for each plate size.
- User-configurable total-weight range (min/max kg, whole numbers) for outputs.
- Local storage persistence for plate inventory and last-used range.

## Core calculations
- All dumbbells must be balanced: each side of a dumbbell uses identical plate stacks.
- Single-dumbbell table: show only achievable totals within range; for each, pick the balanced combination using the fewest total plates (tie-break: heavier plates first). Show per-side stack (e.g., `16 kg => 1, 2, 5 kg each side`).
- Two-dumbbell table: show only achievable permutations where both dumbbells (A and B) are individually balanced and equal in total weight, using available plate counts. Show per-side stack per dumbbell (e.g., `12 kg each => A: 1, 2, 3 kg | B: 1, 1, 4 kg`).
- Respect inventory counts across both dumbbells; avoid solutions that exceed available plates.
- Indicate if a target weight is not achievable.

## Outputs
- Table 1: Balanced single-dumbbell combos (one minimal-plate combo per achievable total).
- Table 2: Balanced two-dumbbell permutations (all valid achievable combos per total).
- Sorted by total weight ascending; optionally collapsible sections by weight.
- Print-friendly styling (monochrome-safe, minimal borders); support browser print to PDF.

## Interaction flow
1) Enter/edit plate sizes with quantities.  
2) Set min/max total weight range.  
3) Generate tables; review on-screen and print/export via browser print.  
4) Persist data automatically in local storage.

## Edge cases & safeguards
- Validate non-negative quantities and positive weights.
- Warn when requested weights exceed achievable totals.
- Handle fractional plate sizes (e.g., 0.5 kg) if entered.
- Clearly show inventory usage per combo to avoid misinterpretation mid-workout.

## Tech notes
- Pure client SPA (no backend); calculations run in browser.
- Any framework acceptable; ensure deterministic generation and idempotent storage reads/writes.
- Prefer pure functions for combinatorics and a memoized search to keep UX fast for moderate inventories.
