# English 11 Speaking Trainer

A static, responsive speaking trainer for Vietnamese Grade 11 learners. It contains **87 reviewed exercises across all ten dedicated Speaking sections** of the supplied **Tiếng Anh 11 – Global Success, Student’s Book, third reprint**. Questions are marked source/adapted, with printed and PDF page references. All model answers, hints and Vietnamese translations are authored. See [content review and scope](docs/CONTENT_REVIEW.md).

No backend, account, AI API, automatic microphone recording, external font, runtime package download or analytics. ChatGPT handoff is manual. Daily English phrases and flashcards remain separate from the textbook bank. LocalStorage stores personal data; JSON backups support manual transfer between browsers/devices.

## Run locally

Use this existing checkout; cloud tasks are already isolated, so no Git worktree is needed.

```sh
cd /workspace/TiengAnh11Speaking
python3 -m http.server 8000 --bind 127.0.0.1
```

The server serves the root standalone release at `/index.html` and the maintainable modular edition at `/src/index.html`. Local requests can verify startup. The standalone root file is designed for direct-from-disk use in desktop browsers (this managed browser blocks file URLs; embedded offline behavior is tested); the modular edition needs HTTP to load ES modules and JSON.

Python 3 and Node.js 20+ are sufficient for build/core tests. This environment provides Python 3.12 and Node 24. There are **no npm dependencies**, so no package install or lockfile is needed.

```sh
npm run build
npm test
```

Build deterministically embeds the current CSS, JS and all JSON into the root **index.html** using Python's standard library. Keep `src/` as the maintainable source; regenerate the root file after changes. Do not hand-edit the generated release.

## Browser validation

With the local server running:

```sh
python3 tests/browser_test.py
```

The browser suite requires Python Playwright and Chromium. They are already available in this prepared environment. On another machine, install the pinned test tooling and its browser:

```sh
python3 -m pip install playwright==1.62.0
python3 -m playwright install --with-deps chromium
```

The runner uses system `chromium` when found, otherwise Playwright's installed Chromium. `CHROMIUM_BIN` can select a browser explicitly. Tests exercise both editions, clipboard success/denial, Custom activity selection, legacy-position migration, card review and timed return, file download/restore, multiple tabs, data failures and responsive layouts. Screenshots/backups go to ignored `.test-results/`. No automated test certifies linguistic quality. Native Safari is a separate [device checklist](docs/DEVICE_CHECKLIST.md).

## Use

- **Daily:** choose a Unit and one of its source Speaking activities. The 87 exercises are grouped into 39 activities, using textbook task numbers and source order. Activity names are concise authored navigation labels. Use Previous/Next or the Question selector within an activity.
- **Answer support:** choose Guided answer (tap individual keyword blanks), Sentence starters (tap each ellipsis to reveal its English phrase), or Meaning only (tap Show meaning hint to reveal the Vietnamese hint). Full model answers stay behind Show model answer. The choice is remembered and included in progress backups; older v1 progress files remain supported.
- **Custom:** view the entire bank grouped by Unit and Speaking activity. Select a Unit, an activity or individual questions, exclude any question, search, and apply or cancel. Selections persist; cancelling preserves the active scope.
- **Copy Voice prompt:** one button copies the current whole activity in Daily, or exactly the applied selection in Custom. The activity title and full question list appear before the button. There are no random pools, count-based Copy buttons, fixed-size lessons or rounds. The selected Answer support level is included in every prompt. Guided answer uses cumulative spoken completion; Sentence starters offers phrase-level support; Meaning only asks for an independent response. Only masked patterns with numbered learner gaps are copied for supported modes; full model answers and gap answer keys never enter prompts. Paste a new prompt into ChatGPT to change its mode; website buttons do not update an existing conversation.
- **Daily English:** save a dated phrase. Optional complete Vietnamese/English pairs automatically create/update linked cards in the same save. No separate card-creation action.
- **Flashcards:** study due cards or manage existing cards. Ratings follow the documented [Anki-style scheduler](docs/SCHEDULER.md). Editing content preserves schedules; Reset schedule is explicit.
- **Download Progress / Update Progress:** export a real JSON backup, preview an import and explicitly restore. Imports replace personal data only. Limits and data-safety details are in [DATA.md](docs/DATA.md).

## Deploy to GitHub Pages

The tested source/release can be reviewed locally. No push or deployment is implied by generating a file. The checked-in workflow deploys when tested changes reach `main` or when manually dispatched, after GitHub Pages is configured to use **GitHub Actions** in repository Settings → Pages. It runs build, core tests and browser checks, then publishes an artifact containing only the root index.html. The workflow requires repository Actions and Pages permissions; no personal token belongs in the app.

For the simplest update, upload **only the generated root index.html** to the root of `main`. For branch-based Pages, configure the `main` branch and root folder as the Pages source. No `src/`, JSON files or dependency directories are required by that one-file edition. If using the Actions deployment workflow, keep the maintainable source/build files alongside the release so its tests and regeneration can run.

Before a publish, fetch the current remote state, preserve newer remote changes, rerun tests and confirm actual push/deployment results. Repository write access, successful deployment and restoration in a fresh cloud task must be verified separately. Do not infer them from a local build or dry run.

## Files

- `src/`: semantic HTML, responsive CSS, plain JS modules and authoritative local data.
- `src/core.js`: source-activity grouping, explicit practice pools and allowlisted Voice prompts. `src/hints.js`: exact model segmentation for authored keyword blanks.
- `src/notebook.js`, `flashcards.js`, `progress.js`, `store.js`: stable links, schedules, validation and atomic persistence.
- `scripts/build_standalone.py`: reproducible self-contained release builder.
- `tests/`: core logic and real-browser integration checks.
- `docs/`: source coverage, scheduler, data contract and native-device checklist.

The supplied PDF and OCR/page images are not part of the deployment. Preserve the relevant rights and source attribution when distributing textbook-derived material.
