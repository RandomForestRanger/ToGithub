# Card 2 — Conditional Lichess auth header + cache-buster sweep

**Project:** Die Caro-Kahn in Blokkie-wêreld — static HTML/CSS/JS chess trainer,
Netlify, no build step. Read `CLAUDE.md` in full before touching anything.

**Files:** `js/engine.js`; all five HTML files; `js/game.js`; `js/reisiger.js`

## Bug A — malformed bearer token

`cloudEval()` and `queryExplorer()` always send
`Authorization: Bearer ` + `(window.LICHESS_TOKEN || '')`. With no token this is a
malformed bearer, which Lichess rejects with 401 — killing both endpoints in exactly
the tokenless default case they must survive.

### Fix A

Build the `headers` object conditionally — include `Authorization` only when
`window.LICHESS_TOKEN` is truthy. No header at all otherwise.

## Bug B — cache-buster drift

Violations of CLAUDE.md §12's bump-everything rule: `endGame()` in `js/game.js`
requests `images/reisiger/face-*.png?v=3`; `js/reisiger.js` `paint()` requests the
same faces with no version suffix; HTML assets sit at an older `?v=` number.

### Fix B

Bump every local CSS/JS/image versioned reference in all 5 HTML files to one number
higher than the current highest found; fix the stray `?v=3` in `endGame()` to match;
make `reisiger.js` append the same suffix in `paint()`. A shared `ASSET_V` constant in
`js/data.js` used by the JS-constructed URLs is acceptable and preferred; HTML
references stay literal.

## Acceptance

- With `window.LICHESS_TOKEN` unset, the fetch to `lichess.org/api/cloud-eval` carries
  no Authorization header (verify in the code path or devtools/network).
- With a token set via `config.local.js`, the header is present and well-formed.
- `grep -rn 'v=' *.html js/` shows a single consistent version number everywhere;
  every face-image URL constructed in JS carries the suffix.

## Session rules

1. **Scope discipline.** Implement only this card. Adjacent bugs go in the final
   report, unfixed. No refactoring, renaming, or style changes beyond the card.
2. **Cache-buster rule (CLAUDE.md §12).** This card *is* the cache sweep — one
   consistent number everywhere, no stragglers.
3. **Verify against the acceptance list**, item by item. Use Node with the
   `module.exports` hooks in `js/data.js` / `js/mastery.js`, or Puppeteer against
   `python3 -m http.server 8000` (file:// will not work — Web Workers and CORS). State
   which items were verified mechanically and which by reading the code only.
4. **Time box.** If any single run exceeds 60 minutes, stop and propose the cheapest
   acceptable cut.
5. **Build log.** Append a short entry to CLAUDE.md's implementation notes: what
   changed, judgment calls, anything deliberately left alone.
6. **Report.** Files touched, per-file diff summary, acceptance checklist with
   pass/fail/unverified, adjacent bugs spotted but not fixed.

Do not begin coding until you have restated both fixes in one sentence each and listed
any ambiguity you intend to resolve by judgment call.
