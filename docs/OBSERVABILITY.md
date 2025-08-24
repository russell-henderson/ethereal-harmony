# Observability Documentation

## Logging

- No server-side logging; browser console is used for diagnostics.
- Performance and error overlays available in-app.

## Metrics

- FPS, frame time, and memory usage sampled in-browser (see `src/lib/diagnostics/PerfEvents.ts`).
- No external metrics or dashboards.

## Tracing

- Not applicable (no distributed system).

## Dashboards

- In-app overlays for performance and diagnostics.

## SLOs

- Not formally defined; app is best-effort for end-user experience.
