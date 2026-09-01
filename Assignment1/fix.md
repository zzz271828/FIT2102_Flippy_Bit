# Flippy Bit — Review Notes & Fix List

Assessment against the FIT2102 2026 Assignment 1 spec, based on reading `main.ts`,
`state.ts`, `types.ts`, `util.ts`, `view.ts`, the test suite, README, git log, and
running `tsc` / `vitest` / `vite build`.

Re-checked and updated: items verified fixed are struck through with a note on
how they were confirmed.

## Bottom line

Functionally this sits around **Full Game + partial advanced**, i.e. high
Distinction / low HD territory. Code quality and process gaps are dragging it
down, and one of the two advanced features was invisible to the marker until
this pass — now documented. Priority 3 (correctness/polish) is fully cleared;
Priority 1 and 2 still have open items.

---

## 1. What already works (don't break these)

- **Minimum requirements** — all met. Base-16 targets, keyboard flip, 8-bit
  binary answer, lowest-target-only comparison, downward movement, correct
  end-game-on-mismatch logic. Git history shows the "matched-but-still-ends-game"
  bug was correctly found and fixed.
- **Full Game requirements** — all met. Spawn gap math checks out exactly:
  `SPAWN_TO_TICK_MIN/MAX` (50–150 ticks × 20ms) = 1–3s, as required. Mouse flip,
  restart-anytime, score display, acceleration all present.
- **Observable/RxJS baseline** — `scan` + `merge` used correctly for state
  management, clearing the pass/fail bar for that section.
- **Immutability** — zero `let`/`var` usage anywhere. Reducers are genuinely
  pure via `Action.apply`.
- **Build health** — `tsc --noEmit` and `npm run build` are both clean. No `any`
  types, no compile errors. It does execute.
- **Pause** (commit `73b087e`) is one of the spec's explicitly-named advanced
  features.

---

## 2. Fix list, in priority order

### 🔴 Priority 1 — Highest leverage, do these first

1. ~~**Document advanced features in `README.md`.**~~ ✅ **FIXED**
   Added an "Advanced Features" section to `README.md` describing Pause and
   the Mario mechanic and how each touches `State`.
   ⚠️ Minor drift: the README's Pause description was written before item 7
   below was fixed, and now undersells it — it doesn't yet mention that
   `Flip`/`KillMario` are also frozen while paused. Worth a one-line update.

2. **Fix the broken test suite.** ❌ **NOT DONE**
   [`test/state.test.ts`](test/state.test.ts) is still empty. `vitest run`
   still fails with `No test suite found in file`. A detailed test plan was
   added to the README as a TODO checklist (by request — actual test code was
   explicitly not to be written yet), but no tests have been implemented.

3. **Turn on the linting the template already gives you, then delete the
   dead code it finds.** ❌ **NOT DONE**
   `tsconfig.json` still has `noUnusedLocals` / `noUnusedParameters`
   commented out. Re-ran the check — all 13 errors from the original review
   are still present, unchanged:
   - [`main.ts:20,29`](src/main.ts#L20) — `catchError`, `startWith` imported, never used
   - [`main.ts:32`](src/main.ts#L32) — `TargetRect` imported, never used
   - [`main.ts:37`](src/main.ts#L37) — `Spawn` imported, never used
   - [`main.ts:44-45`](src/main.ts#L44-L45) — `createRngStreamFromSource`, `rangeScale` imported, never used
   - [`main.ts:114`](src/main.ts#L114) — `subscription` assigned, never read
   - [`state.ts:22`](src/state.ts#L22) — unused import; the whole `Spawn` class (`state.ts`) is still dead code, never constructed anywhere
   - [`util.ts:3`](src/util.ts#L3) — unused `State` import
   - [`test/util.test.ts:2-4`](test/util.test.ts#L2-L4) — entire import line unused

### 🟠 Priority 2 — Real rubric deductions, moderate effort

4. **Run Prettier — line lengths.** 🟡 **MOSTLY FIXED**
   The whole codebase has clearly been reformatted (consistent indentation,
   trailing commas, wrapped call chains). `state.ts` and `types.ts` are now
   fully within 80 chars. Re-scanned all of `src/*.ts` and only 5 lines remain
   over 80 chars, all of them **prose inside comments** that Prettier doesn't
   wrap:
   - [`main.ts:3`](src/main.ts#L3), [`main.ts:51`](src/main.ts#L51), [`main.ts:119`](src/main.ts#L119)
   - [`util.ts:31`](src/util.ts#L31)
   - [`view.ts:62`](src/view.ts#L62) (159 chars — the longest remaining)
   → Manually wrap these five comments; Prettier won't do it for you.

5. **Refactor `Tick.apply` — still a monolith.** ❌ **NOT DONE**
   [`state.ts`](src/state.ts), `Tick.apply` method — still one large function
   doing position update, scoring, target removal, spawn scheduling,
   acceleration, and the entire Mario lifecycle in one object-literal
   construction full of nested ternaries. Only the typo inside it was fixed
   (see item 9); the structural issue remains.

6. **No curried/composed functions or custom generics.** ❌ **NOT DONE**
   Still only the template-provided `RNG` generic; nothing added since.

### 🟢 Priority 3 — Correctness/polish issues — ALL FIXED

7. ~~**Pause doesn't freeze all input.**~~ ✅ **FIXED**
   `Flip.apply` now returns early on `s.gamePause`
   ([`state.ts`](src/state.ts)); `KillMario.apply` now also checks
   `s.gamePause` alongside its existing guards. Verified: `tsc --noEmit`
   clean, existing tests still pass.

8. ~~**`gameOver` and `gamePause` banners aren't mutually exclusive.**~~
   ✅ **FIXED** — at the root cause rather than in the view. `Pause.apply`
   now returns early on `s.gameEnd`, so `gamePause` can never become `true`
   once the game has ended (it's the only writer of that flag). `view.ts`
   needed no change.

9. ~~**Typo in a variable name:** `chackMarioSpawnRes`~~ ✅ **FIXED**
   Renamed to `checkMarioSpawnRes` at all 6 occurrences in
   [`state.ts`](src/state.ts). Verified with `tsc --noEmit`.

10. ~~**Leftover scratch notes shipped in source.**~~ ✅ **FIXED**
    The hex-to-binary scratch comment block at the end of `state.ts` has been
    deleted.

11. **Mario feature is on the trivial end of "advanced."** ❌ **NOT
    ADDRESSED** (design decision, not a bug — see original note below)
    Still a one-shot "click to delete the lowest target" pickup with a flat
    expiry timer — no decay, no scaling, no interaction with score/velocity.
    Now at least documented in the README, but the underlying complexity
    hasn't changed. Not something to "fix" without deciding whether to invest
    more feature work here.

### ⚪ Process note (not a rubric line item, but worth fixing the habit)

12. **Git commit messages are sloppy.** ❌ **NOT ADDRESSED** (and can't be
    fixed retroactively without rewriting history, which isn't recommended).
    Applies going forward only.

---

## 3. Current status summary

| # | Item | Status |
|---|------|--------|
| 1 | Document advanced features in README | ✅ Fixed (minor drift to tidy up) |
| 2 | Fix broken test suite | ❌ Open |
| 3 | Enable strict lint flags, remove dead code | ❌ Open |
| 4 | Prettier / line lengths | 🟡 Mostly fixed (5 comment lines left) |
| 5 | Refactor `Tick.apply` | ❌ Open |
| 6 | Curried/composed functions, generics | ❌ Open |
| 7 | Pause freezes all input | ✅ Fixed |
| 8 | Banner mutual exclusion | ✅ Fixed |
| 9 | `chackMarioSpawnRes` typo | ✅ Fixed |
| 10 | Scratch comment block | ✅ Fixed |
| 11 | Mario feature depth | ❌ Open (design decision) |
| 12 | Commit message hygiene | ❌ Open (process, going forward) |

Remaining highest-leverage work: items 2 and 3 — a working test suite and
dead-code cleanup are both cheap, mechanical, and directly named in the
rubric.
