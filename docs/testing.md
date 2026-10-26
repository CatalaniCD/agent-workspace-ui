# Testing and verification: Agent Workspace

Status: verification procedure complete; committed automation is a follow-up  
Inputs: [intent.md](./intent.md) · [design.md](./design.md) · [plan.md](./plan.md) · [review.md](./review.md)

## 1. Test strategy

Use four layers, moving left where possible:

| Layer              | Purpose                                                              | Current state                     |
| ------------------ | -------------------------------------------------------------------- | --------------------------------- |
| Static checks      | Type safety, lint, production build                                  | Implemented                       |
| Headless smoke     | Render the real UI against a mock or local deployment                | Performed manually; not committed |
| Browser regression | Reproduce the flows below on every PR                                | Planned                           |
| Continuous evals   | Run real operator tasks non-interactively on config or skill changes | Planned                           |

The most important regressions are agent scoping, destructive thread actions, cron state, review routing, and theme hydration.

## 2. Required commands

From the repository root:

```bash
pnpm exec tsc --noEmit
pnpm run lint
pnpm run build
```

Expected results:

- `tsc` exits 0.
- `lint` exits 0 with warnings only; no errors.
- `build` completes and generates the `/` and `/api/[..._path]` routes.
- Remove `tsconfig.tsbuildinfo` after local typecheck/build if it appears as untracked.

Optional formatting check:

```bash
pnpm exec prettier --check .
```

## 3. Test matrix

| ID  | Scenario            | Steps                                          | Expected                                                                 | Automate |
| --- | ------------------- | ---------------------------------------------- | ------------------------------------------------------------------------ | -------- |
| A1  | Load agents         | Open workspace with `apiUrl` and `assistantId` | Combo lists assistants from `assistants.search`                          | Yes      |
| A2  | Switch agent        | Select a different agent                       | `assistantId` changes, `threadId` clears, stream remounts                | Yes      |
| A3  | Graph fallback      | Use a non-UUID graph ID                        | Thread and cron queries use `graph_id`                                   | Yes      |
| T1  | New thread          | Click new-thread control                       | Active thread clears; welcome state returns                              | Yes      |
| T2  | Rename              | Edit title, save, reload                       | Title persists in metadata; existing metadata preserved                  | Yes      |
| T3  | Empty rename        | Clear title and save                           | Validation error; no API call                                            | Yes      |
| T4  | Cancel rename       | Press Escape                                   | Draft discarded; title unchanged                                         | Yes      |
| T5  | Delete inactive     | Trash → confirm on another thread              | Row disappears; active thread unchanged                                  | Yes      |
| T6  | Delete active       | Trash → confirm on active thread               | Row disappears; chat resets                                              | Yes      |
| T7  | Delete cancel       | Trash → cancel                                 | No API call; row remains                                                 | Yes      |
| O1  | Open operations     | Click Operations                               | Sheet opens; default tab is Scheduled                                    | Yes      |
| O2  | Deep link           | Load `operationsOpen=true&operationsTab=runs`  | Runs tab opens directly                                                  | Yes      |
| O3  | Scheduling guide    | Click How to schedule jobs in Operations       | Walkthrough opens with steps, cron examples, timezone guidance, and tips | Yes      |
| O4  | Guide dismiss       | Click Got it or press Escape                   | Guide closes; Operations state is unchanged                              | Yes      |
| C1  | List crons          | Open Scheduled                                 | Crons for selected assistant only                                        | Yes      |
| C2  | Create cron         | Fill dialog and submit                         | Cron appears; success feedback                                           | Yes      |
| C3  | Pause/enable        | Toggle switch                                  | UI updates; server confirms                                              | Yes      |
| C4  | Toggle failure      | Force server error                             | UI rolls back; error toast                                               | Yes      |
| C5  | Delete cron         | Inline confirm                                 | Cron removed after success                                               | Yes      |
| R1  | Load runs           | Open Runs                                      | Recent runs render with status and time                                  | Yes      |
| R2  | Filter runs         | Select status filter                           | Only matching runs render                                                | Yes      |
| R3  | Open run thread     | Click a run                                    | Sheet closes; thread opens                                               | Yes      |
| V1  | Review queue        | Open Reviews                                   | Interrupted threads render with pending actions                          | Yes      |
| V2  | Review handoff      | Click Review                                   | `threadId` set; sheet closes; inbox renders                              | Yes      |
| V3  | Approve/reject/edit | Submit a decision in inbox                     | Run resumes or ends through existing flow                                | Yes      |
| TH1 | Light theme         | Toggle to light                                | `html.class="light"`; readable surfaces                                  | Yes      |
| TH2 | Dark theme          | Toggle to dark                                 | `html.class="dark"`; readable surfaces                                   | Yes      |
| TH3 | Persistence         | Reload after toggle                            | Preference persists                                                      | Yes      |
| TH4 | No icon             | Inspect document head                          | No favicon link                                                          | Yes      |

## 4. Manual smoke procedure

1. Start the app and a LangGraph deployment:

   ```bash
   pnpm dev
   ```

2. Open the app with the deployment URL and assistant ID.
3. Confirm the agent selector shows the expected assistant.
4. Switch agents and confirm the chat resets.
5. Send a prompt and confirm streaming still works.
6. Rename the conversation, reload, and confirm the title.
7. Delete a conversation and confirm the row disappears.
8. Open Operations and exercise each tab.
9. Open a review and confirm the existing approval UI appears.
10. Toggle theme, reload, and confirm the resolved theme persists.

For a UI-only smoke without a real server, run the app against a mock that returns:

- `POST /assistants/search` → at least two assistants;
- `POST /threads/search` → one titled thread and one interrupted thread;
- `POST /runs/crons/search` → one enabled cron;
- `GET /threads/{id}/runs` → one run;
- `GET /threads/{id}/history` and `/state` → a minimal state.

Verify with headless Chrome:

```bash
google-chrome --headless=new --no-sandbox --disable-gpu \
  --virtual-time-budget=12000 --dump-dom \
  'http://localhost:3000/?apiUrl=http%3A%2F%2Flocalhost%3A2024&assistantId=agent&operationsOpen=true&operationsTab=reviews'
```

Check the DOM for `Review queue`, the pending action name, and the thread title. Run the same command with `--force-dark-mode` and confirm `<html class="dark">`.

Expected request sequence when opening the app:

```text
GET /info
POST /threads/search
POST /assistants/search
POST /runs/crons/search        (Scheduled tab)
GET /threads/{id}/runs         (Runs tab, max 12 threads)
POST /threads/search           (Reviews tab, status=interrupted)
```

## 5. Theme verification

| Check                  | Light                               | Dark                              |
| ---------------------- | ----------------------------------- | --------------------------------- |
| Body background / text | `bg-background` / `text-foreground` | Same semantic tokens, dark values |
| Sidebar border         | `border-border`                     | Same                              |
| Chat input surface     | `bg-muted`                          | Same                              |
| Markdown tables        | Light borders and header            | Dark borders and header           |
| Syntax highlighting    | `oneLight`                          | `coldarkDark`                     |
| Toggle icon            | Moon                                | Sun                               |
| Native controls        | `color-scheme: light`               | `color-scheme: dark`              |

Evidence images: [ui-light.png](./images/ui-light.png) and [ui-dark.png](./images/ui-dark.png).

## 6. Continuous evals

Build an eval set of 20–50 real operator tasks, for example:

- "Select Content Agent and rename the newest thread to 'Weekly review'."
- "Pause the daily content summary cron."
- "Find the interrupted publish action and open it for review."
- "Show successful runs from the last day."
- "Switch to dark mode and reload."

Run the set non-interactively on changes to `CLAUDE.md`, skills, hooks, and this workspace configuration. Gate configuration merges on pass rate. Record:

- task success rate;
- wrong-agent or wrong-thread actions;
- destructive-action confirmations;
- theme regressions;
- API requests per task.

Every production incident in these flows becomes a permanent eval.

## 7. Known gaps

- No committed Playwright tests yet.
- Runs dashboard is capped and not paginated.
- Cron editing is not supported.
- Review queue is limited to 50 interrupted threads.
- Theme contrast has been checked visually, not with an automated axe or Lighthouse gate.
- The mock server used for smoke testing is not part of the repository.

## 8. Metrics

Leading:

- first-pass success for the commands above;
- smoke-test duration;
- eval pass rate;
- time to detect a broken review route.

Lagging:

- escaped defects in agent switching, thread mutation, crons, or reviews;
- review completion rate;
- accessibility and theme regression reports;
- rework after operations changes.

## 9. Incident loop

1. Reproduce the incident with a failing check or eval.
2. Commit the failing test or eval before the fix.
3. Fix the code.
4. Run the full matrix.
5. Keep the eval permanently.
6. Record the diagnosis as a new [intent.md](./intent.md) if the fix changes scope or policy.
