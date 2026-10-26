# Plan: Agent Workspace

Status: implemented, verification complete  
Inputs: [intent.md](./intent.md) · [design.md](./design.md)  
Review policy: [review.md](./review.md) · Verification: [testing.md](./testing.md)

## 1. Goal

Deliver an operator workspace that adds agent selection, conversation management, cron/run/review operations, and light/dark themes without changing the LangGraph backend or weakening human approval gates.

## 2. Scope

In scope:

- assistant / graph discovery and selection;
- thread rename and delete;
- scheduled cron list, create, pause, enable, and delete;
- recent runs dashboard;
- interrupted-thread review queue with handoff to the existing inbox;
- light/dark theme with a persistent toggle;
- removal of the browser tab icon;
- versioned intent, design, plan, review, and testing artifacts.

Out of scope:

- server or SDK changes;
- role-based access control and multi-tenancy;
- cron editing;
- pagination beyond the bounded first page;
- committed browser automation (defined as a follow-up in [testing.md](./testing.md)).

## 3. Delivery phases

| Phase                    | Outcome                                                  | Status | Evidence                                                                     |
| ------------------------ | -------------------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| 0. Diagnose              | Confirm current UI gaps and SDK constraints              | Done   | intent.md                                                                    |
| 1. Foundations           | Shared SDK client, thread helpers, agent provider        | Done   | `src/providers/Thread.tsx`, `src/providers/Agents.tsx`, `src/lib/threads.ts` |
| 2. Conversation controls | Inline rename, delete confirmation, title fallbacks      | Done   | `src/components/thread/history/index.tsx`                                    |
| 3. Agent selection       | Header selector, setup-form discovery, stream remount    | Done   | `agent-selector.tsx`, `providers/Stream.tsx`                                 |
| 4. Operations            | Scheduled, Runs, Reviews tabs and create dialog          | Done   | `src/components/operations/*`                                                |
| 5. Theme                 | Light/dark/system theme, toggle, semantic surface colors | Done   | `theme-toggle.tsx`, `layout.tsx`, component color updates                    |
| 6. Verification          | Typecheck, build, lint, headless smoke                   | Done   | commands in [testing.md](./testing.md)                                       |
| 7. Documentation         | Intent, design, plan, review, testing, diagrams, images  | Done   | `docs/`                                                                      |

## 4. Work breakdown

### Phase 1 — Foundations

- [x] Create a memoized SDK client in `ThreadProvider`.
- [x] Add `refreshThreads`, `renameThread`, and `deleteThread`.
- [x] Move thread search metadata and title resolution into `src/lib/threads.ts`.
- [x] Add `AgentsProvider` with list, refresh, selection, error, and loading state.
- [x] Wrap the app with `AgentsProvider`.

### Phase 2 — Conversation controls

- [x] Add inline rename with save, cancel, Escape, and empty-name validation.
- [x] Persist `title` in thread metadata without dropping existing metadata.
- [x] Add title fallbacks: `title`, `thread_name`, `name`, first human message, thread ID.
- [x] Add trash icon and confirmation dialog.
- [x] Clear the active thread when the deleted thread is open.
- [x] Update local state after rename and delete without a full reload.

### Phase 3 — Agent selection

- [x] Add header agent dropdown with selected agent, loading, and error states.
- [x] Clear `threadId` on agent switch.
- [x] Key the stream session by assistant ID.
- [x] Add "Load agents" discovery to the setup form.
- [x] Preserve graph-ID fallback when no assistant matches.

### Phase 4 — Operations

- [x] Add right-side operations sheet with URL-backed open and tab state.
- [x] Scheduled tab: list, search, create, optimistic enable/pause, delete.
- [x] Create dialog: title, schedule presets, cron expression, timezone, prompt, end time, enabled, keep-thread.
- [x] Runs tab: recent runs, status filters, counts, open thread.
- [x] Reviews tab: interrupted threads, pending actions, refresh, open review.
- [x] Add an in-product "How to schedule jobs" guide with a cron walkthrough and examples.
- [x] Hand off review decisions to the existing agent-inbox.
- [x] Bound runs fan-out to 12 threads and 5 runs per thread.
- [x] Surface errors with retry or rollback.

### Phase 5 — Theme and branding

- [x] Mount `next-themes` with class attribute, system default, and no transition.
- [x] Add `ThemeToggle` with hydrated icon selection.
- [x] Place the toggle in welcome, active chat, thread sidebar, and setup form.
- [x] Replace hardcoded grays on primary surfaces with semantic tokens.
- [x] Add dark overrides for markdown and syntax highlighting.
- [x] Remove the LangGraph logo image and rename the product to Agent Workspace.
- [x] Remove the GitHub repo button.
- [x] Remove `favicon.ico` and suppress the icon metadata.

### Phase 6 — Verification

- [x] `pnpm exec tsc --noEmit` passes.
- [x] `pnpm run build` passes.
- [x] `pnpm run lint` completes with warnings only (no errors).
- [x] Headless render confirms agents, threads, operations tabs, delete action, and theme classes.
- [ ] Committed Playwright regression suite.
- [ ] Continuous eval set of 20–50 real operator tasks.

## 5. Verification plan

Run from the repository root:

```bash
pnpm exec tsc --noEmit
pnpm run lint
pnpm run build
```

Smoke test with a running LangGraph deployment:

1. Open the workspace; confirm the assistant list loads.
2. Switch agents; confirm the active thread clears.
3. Send a prompt; confirm streaming still works.
4. Rename the thread; reload and confirm the title persists.
5. Delete a non-active thread; confirm it disappears.
6. Delete the active thread; confirm the chat resets.
7. Open Operations → Scheduled; create, pause, enable, delete.
8. Open Operations → Runs; filter by status and open a thread.
9. Open Operations → Reviews; open an interrupted thread and submit a decision.
10. Toggle light/dark; reload and confirm the preference persists.

Detailed matrix and expected API calls: [testing.md](./testing.md).

## 6. Rollback

- Revert the feature commit to restore the previous chat UI.
- No database migrations or backend state were introduced.
- Thread renames are metadata-only; deletion is permanent and has no rollback.
- Theme can be disabled by removing `ThemeProvider`; semantic classes remain readable in light mode.

## 7. Risks and mitigations

| Risk                             | Likelihood | Impact | Mitigation                                                  |
| -------------------------------- | ---------- | ------ | ----------------------------------------------------------- |
| Large deployments make runs slow | Medium     | Medium | 12-thread / 5-run cap; add pagination next                  |
| Wrong agent selection            | Low        | High   | Selected agent visible; switch clears thread                |
| Accidental conversation deletion | Low        | High   | Confirmation dialog with title                              |
| Interrupt review bypass          | Low        | High   | Reviews tab only navigates; existing inbox approves         |
| Dark-mode contrast gaps          | Medium     | Medium | Semantic tokens; screenshots; manual accessibility pass     |
| API key exposure                 | Low        | High   | Existing client-side key handling unchanged; no new logging |
| Duplicate cron actions           | Low        | Medium | Optimistic rollback; refresh after create/delete            |

## 8. Metrics for this plan

Leading:

- time to select an agent;
- time to locate a paused review;
- first-pass verification success for future changes;
- number of operations requests per open.

Lagging:

- review completion rate;
- rework from wrong-agent or wrong-thread actions;
- production defects in cron or review flows;
- accessibility or theme regressions.

## 9. Follow-ups

1. Add Playwright coverage for the ten smoke scenarios.
2. Add a 20–50 task non-interactive eval suite and gate config changes on pass rate.
3. Add run pagination and server-side filtering.
4. Add cron editing if requested.
5. Add permissions before broadening operations access.
6. Replace the removed favicon with an intentional Agent Workspace icon if branding requires one.
