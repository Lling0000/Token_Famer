# Design QA

- Source target: `D:/AppCaches/Lingling/Temp/codex-clipboard-fc4ce27d-a6ea-46d8-be23-5edbf1acde2e.png`
- Implemented asset: `apps/web/public/assets/model-flower-sprites.png`
- Verified surfaces: farm canvas at 1440 x 900, shop crop grid, model picker

## Comparison

- OpenAI, Claude, Gemini, and Grok plants use the supplied pixel artwork rather than code-drawn approximations.
- Brand ordering and identities match the selected reference.
- The transparent sprite sheet preserves the flower heads, stems, leaves, soil, and terracotta pots.
- Shop previews and mature farm plants reuse the same source asset.
- The shop shows exactly one purchasable flower card for each of the four approved brands.
- DeepSeek and Zhipu no longer appear in the model catalog.

## Result

No P0, P1, or P2 visual mismatch remains for the requested flower replacement.

final result: passed
