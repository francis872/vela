# VELA Design System

## Visual direction

VELA combines a warm editorial workspace with an engineered dark navigation system. The visual language is precise, quiet and technical, with restrained accents rather than neon or decorative space imagery.

## Foundations

Tokens live in `src/app/globals.css` and cover semantic colors, light/dark surface groundwork, spacing, radii, borders, shadows, motion, z-index and data confidence.

Official brand assets are consumed through `src/components/brand-logo.tsx`:

- `VELA.png`: symbol
- `VELA (2).png`: wordmark
- `VELA (3).png`: full mark

## Primitives

- `BrandLogo`
- `DataState`
- `Metric`
- existing buttons, inputs, badges and progress primitives

`Metric` accepts a `MetricResult`, so a missing value cannot silently become zero. `DataState` centralizes `READY`, `INSUFFICIENT_DATA` and `UNAVAILABLE` presentation.

## Interaction

Motion is short and functional: fast hover/focus, normal panel transitions and slow metric width transitions. Reduced motion is respected. Search is visible in the TopBar but remains disabled until real global search exists.
