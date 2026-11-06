# Recovery validation

The application was recovered from the user-supplied conversation export in this workspace. Full creation commands restored the original question bank and baseline code. Later changes recorded only as “Wrote” had no patch contents; those portions of hints.js, core.js, progress.js and app.js were reconstructed from the recorded requirements and recovered tests. This release is a tested reconstruction, not a byte-for-byte recovery of the deleted environment.

Current checks: deterministic standalone build; 35 Node tests; 272 Chromium browser assertions across modular and standalone editions, including activity selection, all support levels, Voice prompt output, local progress, card scheduling, migration of legacy backups, storage failures, and responsive layouts. See the current command results before claiming readiness.

All 87 question records, their authored translations, models and hints, the frame and keyword mappings, and all 39 activity titles were extracted from the export. The original PDF is unavailable here; its historic source-verification claims were not independently repeated during recovery. Native Safari and an actual ChatGPT Voice session are not tested. Browser interaction and clipboard tests validate the generated handoff, not Voice behavior.

Publication to GitHub Pages and restoration in a fresh cloud task are separate checks. This document alone is not evidence of either.
