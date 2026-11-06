# Native device checks

Automated Chromium tests cover both modular and standalone editions at widths 1280, 768, 390 and 320 pixels. Those viewport checks do not establish actual iPhone/iPad Safari behavior. Native devices were not available in this environment.

On an iPhone and iPad running Safari, separately verify:

- All controls remain readable and reachable in portrait/landscape; inputs do not trigger unwanted zoom; hardware/software keyboard navigation has visible focus.
- Vietnamese and model-answer toggles act independently and reset on navigation. Check all three Answer support levels; keyword blanks should open individually by tap or keyboard, sentence starters should remain readable, and switching questions should remask all blanks.
- Copy Voice prompt copies exactly the visible activity or Custom selection with the chosen support mode on a direct gesture over HTTPS. After denying clipboard access, the full prompt remains selectable for manual copy. Check pasting Vietnamese accents and all four Voice commands into ChatGPT yourself.
- Download Progress saves a JSON file to Files. Update Progress lets you choose that file, cancel, choose it again, preview and explicitly restore. Test moving it between iPhone and iPad. Inspect schedules and phrase links after restore.
- Private browsing/storage denial or quota failure shows a session-only notice and still permits download. Do not assume localStorage is shared between file URLs, different browsers, origins or devices.
- Flashcard tap, Show answer/Show front, Enter/Space and 1–4 work with one visible face. An Again card returns after one minute while Safari remains active. Background timer throttling can delay display until the tab is active again.
- Reduced Motion settings cause no animation. VoiceOver reads labels, dialog titles and button states.

A downloaded standalone file can be used without the network in desktop browsers. iOS Files/Quick Look behavior is separate from Safari hosting: prefer GitHub Pages for regular Safari use. No claim is made that Quick Look executes the application.
