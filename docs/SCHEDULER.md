# Anki-style scheduler

This deterministic scheduler is **Anki-style, not Anki FSRS or Anki sync**. It predicts no accuracy, mastery or pronunciation scores. The learner chooses each rating after seeing the English answer. A day is 24 hours; due timestamps remain absolute across timezone changes.

| State | Again | Hard | Good | Easy |
|---|---|---|---|---|
| New / learning step 0 | 1 minute, step 0 | 6 minutes, same step | 10 minutes, step 1 | graduate, 4 days |
| Learning step 1 | 1 minute, reset to step 0 | 10 minutes, same step | graduate, 1 day | graduate, 4 days |
| Relearning step 0 | 1 minute, step 0 | 6 minutes, same step | 10 minutes, step 1 | graduate, 4 days |
| Relearning step 1 | 1 minute, step 0 | 10 minutes, same step | graduate at retained reduced interval | graduate, 4 days |
| Review | lapse; reduce interval to rounded 50% (at least 1 day), ease −0.2, enter relearning due in 1 minute | rounded interval ×1.2; ease −0.15 | rounded interval ×ease | rounded interval ×ease×1.3; ease +0.15 |

Review growth has a minimum of old interval +1 day and a maximum of 36,500 days. Ease is bounded to 1.3–3.5, starting at 2.5. Every rating increments repetitions; only a review Again increments lapses. Hard/Again do not graduate a learning card. Again on a learning card does not create a review lapse.

New cards are due immediately. Among due cards, learning/relearning/review cards precede new ones; then due time and stable ID break ties. A direct Study action can select a particular due card. Future cards are not shown. A one-second check returns waiting cards when due while the study dialog remains open. No background activity is assumed after the page is closed. The UI displays the actual interval produced by this same scheduler beside every rating.
