# UI iteration and verification

## Agreed direction

Pixel game UI with strong HUD and tool feedback. Model flowers grow directly from the soil. Background music is off by default; farm action sounds remain enabled.

## Implemented in this iteration

- Shared pixel window styles cover authentication, registration, onboarding, shop, warehouse, leaderboard, tasks, API, social settings, and sandbox payment.
- Entry and onboarding explain planting, harvesting, and activation. Onboarding displays the unified 80,000 Token Credit grant and derives the model count from the catalog.
- Farm radar locates harvest, water, weed, bug, and empty plots. Locating a plot does not spend resources or execute an action.
- The selected plot offers an explicit contextual action. Mature crops prioritize harvesting; growing crops prioritize issues and then water.
- Care counts include thirsty plants and count each affected growing plot once. Locked and empty land are excluded.
- Harvested packages link to the warehouse and show a pending activation badge. Warehouse copy describes the unified wallet.
- Tool buttons, pointer tools, and successful land action effects share pixel artwork: watering can, hoe, sprayer, and sickle.
- New twelve-frame transparent flower art replaces the potted logo sprites. Four brands share seedling, flowering, and mature stages; calibrated root anchors map each frame to the soil and shop previews.
- One projection supplies draw positions and hit tests. The central soil tile is plot 13; all 24 land IDs have unique hit regions. The remaining background tile has an entrance sign.
- Land footprints use 104 × 52 source pixels and the vertical step is calibrated to 63 pixels.
- UTF-8 BOM removal restores the first imported stylesheet selectors, including full-height layout and modal overlays.
- At 1280 × 720, the friend list scrolls independently and the dock stays within the viewport.
- Dialogs capture focus, contain Tab navigation, support Escape, and restore focus to their trigger. Friend search has a labeled input and recoverable empty state.
- Audio defaults to effects only, supports separate music control, and closes its context when leaving the game.

## Verification coverage

- Unit regressions cover care counts, action priorities, batch harvest model identity and repeat prevention, four-size land hit testing, pot exclusion, and effects-only audio.
- Browser regressions cover radar-to-action-to-activation, dialog focus, friend search, matching tool artwork, central land selection, successful tool feedback, onboarding, and disabled harvesting on an empty farm.
- Desktop checks include 1280 × 720, 1440 × 900, 1920 × 1080, and 2560 × 1440. Stage and tool dock bounds are checked in addition to horizontal overflow.
- Local screenshots were inspected for entry, onboarding, farm, shop, warehouse, leaderboard, tasks, and API.

## Remaining iteration candidates

- Continue tuning flower silhouettes and scale from user feedback; the v2 sprite sheet and root anchors are documented in `docs/model-flower-art.md`.
- Refine low-resolution pixel tool silhouettes through user review.
- Add individual action-sound volume controls and persistent audio preferences.
- Extend panel size checks to every panel and supported desktop resolution.
- Replace static sandbox task progress, ranking fixtures, friend status, and API preview data with authoritative server query hooks in a separately scoped integration change.

This is an iteration record, not a declaration that all visual or product defects have been eliminated.
