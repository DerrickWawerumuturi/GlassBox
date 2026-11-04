# Glassbox brand and visual identity

This directory contains the approved brand expression and its assets. The live product's CSS tokens and implementation are authoritative for current values and behavior; editorial extensions are governed by `../editorial/VISUAL_LANGUAGE.md`.

## Identity

Glassbox is counted clarity: we show what technology job ads say, how the count was made, and leave decisions to the reader. The phrase **“We show, you decide”** describes the product voice. Preserve the open-box mark, custom wordmark and restrained orange dot. Do not replace the approved marks or existing story artwork with a generic template.

## Source of truth

- [`../editorial/VISUAL_LANGUAGE.md`](../editorial/VISUAL_LANGUAGE.md) — current three-layer identity, colour meanings, type roles, stories/covers, provenance, accessibility and motion.
- [`../decisions/design-system.md`](../decisions/design-system.md) — implementation history and product token behavior.
- [`../decisions/data-visualization.md`](../decisions/data-visualization.md) — data encodings and the legacy `/analysis` boundary.
- Mark rendering is implemented in `../../frontend/src/components/brand/`; CSS tokens are defined in `../../frontend/src/app/globals.css`.

The approved lockups, icons and usage notes are in [`assets/`](assets/README.md). The dated brand book, workbook, naming research and working prototypes remain local-only under `docs/brand/`; this README is the shared brand entry point.

## Voice

Be warm, direct and evidence-led. Let specific counts create interest; avoid hype and false urgency. Name what every number counts and say what the data cannot establish. Lead with strengths when comparing a CV with jobs; never tell a person what to learn or apply for.

## Colour boundary

Orange is the product action and annotation colour; it is not a data category in the current dashboard or market-story grammar. The older `/analysis` chart ramp is explicitly legacy and documented as a scoped exception in the design-system decision. Green/neutral/lime meanings and story-specific keyed palettes are described in the current visual identity specification.


## Design references

The chart work studied **Search Party** for subject-first titles, a source slash, framed plots and restrained highlighting. Glassbox adapts those devices to its own data rules: orange is not a data category; green means on the CV; neutral hatching means not yet; counts and text equivalents remain visible. **The Pudding** is a process and craft reference, not a template. Story-specific art direction must follow the evidence. See [`../editorial/REFERENCE_LIBRARY.md`](../editorial/REFERENCE_LIBRARY.md).
