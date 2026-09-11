# VELA UX Architecture

## Reference interpretation

The wide reference is the product map: a dark navigation system, grouped operating modules, contextual panels and a responsive shift from workspace columns to prioritized mobile sections.

The Home reference is the Venture Pulse composition: venture context first, then pulse metrics, current Sprint and one strategic insight, followed by trajectory, key metrics and a restrained context column for next actions, activity and Network.

The references are implemented as layout, tokens, components and real states. They are not used as images or copied screenshots.

## Home hierarchy

1. Venture greeting, venture context and real phase.
2. Venture Pulse metrics.
3. Current Sprint and VELA AI observation/recommendation.
4. Trajectory and Key Metrics.
5. Next Actions, Recent Activity and Network context.

## Responsive behavior

Desktop keeps the sidebar, workspace and context column. Tablet collapses the context column below the workspace. Mobile uses the existing mobile navigation and stacks Pulse, Sprint, AI, trajectory, metrics and context sections.

## Data principles

Home never creates activity or metric values for visual completeness. Missing evidence is represented by `INSUFFICIENT_DATA`, `UNAVAILABLE`, an empty state or `null`.
