# Implementation Plan — donebell SPA (ES6 modules, no framework)

## Stack & setup
- Pure browser app using native ES6 modules, no bundler; served as static files.
- HTML/JS plus a rapid-prototyping CSS framework via CDN (e.g., Bootstrap 5); add a light print stylesheet for tables.
- LocalStorage for persistence of plate inventory and last-used weight range.

## Data model
- Plate: `{ weightKg: number, quantity: number }` with weight step of 0.25 kg.
- Settings: `{ minKg: number, maxKg: number }` (whole kg).
- Derived tables are computed on demand; nothing server-side.

## Core logic (functions)
- Inventory normalization: validate positives, snap weights to 0.25 kg steps, clamp quantities to integers.
- Combination engine (pure functions):
  - Generate balanced single-dumbbell combos per achievable total within range, selecting minimal plate count (tie-break heavier plates first).
  - Generate all valid balanced two-dumbbell permutations respecting inventory counts, ensuring both dumbbells equal total and balanced.
  - Detect and mark unachievable targets.
- Formatting helpers: per-side stack strings for display and print.

## UI flow
1) Inventory form: add/edit plate rows (weight, quantity), validate on change, save to LocalStorage.
2) Range form: set min/max total (whole kg).
3) Generate button: compute results and render two tables:
   - Table 1: single-dumbbell minimal-plate combo per total.
   - Table 2: two-dumbbell permutations (all valid) with per-side stacks.
4) Print: use browser print; ensure print stylesheet keeps tables readable.

## Persistence
- Load inventory and settings from LocalStorage on startup; auto-save on changes.
- Provide “reset to defaults” to clear storage.

## Edge handling
- Guard against invalid inputs (non-numeric, negatives, non-multiples of 0.25 kg).
- Warn when requested range exceeds achievable totals.
- Keep computation efficient via memoization/caching of achievable per-side stacks.

## Testing approach (manual to start)
- Fixture inventories (e.g., 2×0.75kg, 4×1kg, 4×2kg, 4×5kg) and ranges to verify achievable/unachievable cases.
- Spot-check minimal-plate selection and inventory-respecting permutations.

## Next steps
- Build minimal HTML/CSS/JS scaffold.
- Implement pure calculation module + simple state/persistence layer.
- Wire UI to calculations and render tables.
- Add print styles and quick manual test pass.
