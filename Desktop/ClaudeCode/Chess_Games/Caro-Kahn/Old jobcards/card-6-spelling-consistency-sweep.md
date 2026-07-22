# Card 6 — Perfunctory sweep: spelling, copy, and spec–code consistency

**Project:** Die Caro-Kahn in Blokkie-wêreld — static HTML/CSS/JS chess trainer,
Netlify, no build step. Read `CLAUDE.md` in full before touching anything.

**Prerequisite:** Cards 1–5 are merged. This card reconciles the words with the code
as it now stands, not as originally specced.

**Files:** all five HTML files, all `js/` file header comments, `css/` comments if
any, `CLAUDE.md`.

## Task A — Caro-Kahn → Caro-Kann

The opening is named for Horatio Caro and Marcus Kann: **Caro-Kann**, double-n. The
body copy in `biomes.html`, `how-to-play.html` and `karpov.html` is already correct;
the `<title>` tags and `<h1>` of `index.html` and `game.html`, the header comment of
every `js/` file, and `CLAUDE.md`'s own title all say "Caro-Kahn".

**Fix:** Correct every occurrence — but **text level only**: visible strings, titles,
comments, and CLAUDE.md prose.

**Hard constraints:**
- Do **not** rename files, directories, image paths, or the repo/site itself.
- Do **not** touch `GAME_PREFIX` (`'kampKarpov'`) or any localStorage key — renaming
  keys would silently wipe every child's mastery progress.
- Do **not** alter any URL, `play=` string, SAN, FEN, or UCI content.

After the sweep, `grep -rin 'kahn' .` (excluding `.git`, `images/` binary content)
must return zero hits.

## Task B — Player-facing copy vs implemented behaviour

Cross-check every number and rule stated in `how-to-play.html` against the code as it
stands after Cards 1–5:

- The scoring table: 30 cp approval threshold, 100 cp penalty, 300 cp blunder,
  diamond = 3 emeralds, +5 win, +3 The End, move 30 — each must match `SCORE` in
  `js/data.js`.
- The terugvat paragraph must match Card 3/4 behaviour (replacement move earns
  nothing; an undone blunder is forgiven).
- The rails description (hint at 2 wrong tries, target hint at 3) must match Card 1's
  capped escalation behaviour.
- Do **not** document the move-25 gift or the grace move — it is a deliberate
  surprise mechanic and describing it would defeat its pedagogy.

Where copy and code disagree, the code (post Cards 1–5) is authoritative; amend the
copy. Keep the register: simple, warm Afrikaans for ±10-year-olds, consistent with
the surrounding text. Fix outright spelling or grammar errors in visible Afrikaans
strings (HTML and `js/data.js` dialogue) but do not rewrite pedagogy, tone, or the
Reisiger's voice.

## Task C — Bring CLAUDE.md back into truth

CLAUDE.md is a living spec. Update it so a fresh reader gets the system as built:

- Record owner decisions D1 (diamonds count ×3 toward Silwer), D2 (undo forgives a
  blunder), D3 (move-25 grace move) in the relevant sections.
- Reconcile any constant that has drifted between spec prose and `js/data.js` /
  `js/engine.js` (animation timings, thresholds, depths, skill levels) — list every
  such drift in your report and correct the spec side.
- Append a build-log entry for this card as usual.

## Acceptance

- `grep -rin 'kahn'` clean (per Task A scope); site loads and plays normally; every
  child's saved mastery still appears on the home screen (localStorage untouched).
- Every number in `how-to-play.html`'s scoring table equals the corresponding `SCORE`
  constant.
- CLAUDE.md contains D1–D3 and no constant that contradicts the code.
- A native-level read of all visible Afrikaans strings reports no spelling errors;
  any uncertain idiom is flagged in the report rather than changed.

## Session rules

1. **Scope discipline.** Words only — no logic changes whatsoever. If Task B reveals
   a behaviour that seems wrong, report it; do not fix it.
2. **Cache-buster rule (CLAUDE.md §12).** HTML text changes alone do not require a
   bump, but if you touch any `js/` or `css/` file (header comments count), bump the
   `?v=` suffix everywhere to one higher than the current highest.
3. **Verify against the acceptance list**, item by item; the greps and constant
   comparisons must be run mechanically, not by inspection.
4. **Time box.** If any single run exceeds 60 minutes, stop and propose the cheapest
   acceptable cut.
5. **Build log.** Append a short entry to CLAUDE.md's implementation notes.
6. **Report.** Files touched, every spec–code drift found and how it was resolved,
   every copy amendment with before/after, flagged-but-unchanged idioms, adjacent
   bugs spotted but not fixed.

Do not begin until you have listed the occurrences of "Kahn" you intend to change and
confirmed none falls under the hard constraints.
