# Review instructions: Agent Workspace

Applies to: pull requests touching the workspace UI, providers, operations, reviews, or themes  
Inputs: [intent.md](./intent.md) · [design.md](./design.md) · [plan.md](./plan.md) · [testing.md](./testing.md)

## 1. Review principle

Humans own intent, risk, and the approval decision. Agents may perform the full review pass, but an agent must never be the approver for protected paths, production release, or a human-in-the-loop decision.

## 2. Automated gates before human review

All must pass:

```bash
pnpm exec tsc --noEmit
pnpm run lint
pnpm run build
```

If the change touches dependencies, also run the package-manager audit policy for the repository. If the change touches the stream or interrupt flow, attach evidence from [testing.md](./testing.md).

## 3. Review passes

### Pass 1 — Bugs and behavior

- Agent switch clears the active thread and remounts the stream.
- Thread lists and crons stay scoped to the selected assistant or graph.
- Rename preserves existing metadata and rejects empty titles.
- Delete removes local state only after the server confirms; deleting the active thread resets the chat.
- Cron toggle rolls back on failure.
- Runs tab respects the 12-thread and 5-run caps.
- Reviews tab never approves or rejects directly; it only navigates to the existing inbox.
- Theme toggle does not cause a hydration mismatch or persist across the wrong session boundary.

### Pass 2 — Security and privacy

- No API key, token, or secret is logged, committed, or placed in a URL.
- No new endpoint is called with broader scope than the selected agent requires.
- Destructive actions require confirmation.
- Review decisions remain behind the existing human gate.
- Error messages do not echo credentials or full sensitive payloads.
- New links and popups use safe attributes.

### Pass 3 — Compliance with the artifacts

- The implementation matches [design.md](./design.md), or the design is updated in the same PR.
- New behavior has a test row in [testing.md](./testing.md), or a follow-up is recorded.
- Any new permission, retention, or PII behavior is flagged to the policy owner.

### Pass 4 — UX and accessibility

- Light and dark themes both meet readable contrast on primary surfaces.
- Keyboard users can open the selector, tabs, dialog, and toggle.
- Focus is visible and dialogs trap focus correctly.
- Loading, empty, and error states exist for every network surface.
- Destructive controls are not the default focus target.
- Mobile layout remains usable at the existing breakpoint.

### Pass 5 — Performance

- New list views are bounded.
- No effect triggers an unbounded request loop.
- The runs fan-out does not grow silently with the number of threads.
- Theme changes do not remount the stream or reload data.

## 4. Severity definitions

| Severity  | Definition                                                                         | Required action                                     |
| --------- | ---------------------------------------------------------------------------------- | --------------------------------------------------- |
| Critical  | Data loss, secret exposure, approval bypass, cross-tenant access                   | Block merge; notify owner; human gate               |
| Important | Broken core flow, wrong-agent action, unbounded load, inaccessible primary control | Block merge until fixed or explicitly risk-accepted |
| Minor     | Edge-case layout, copy, non-blocking error state                                   | Fix in this PR or file follow-up                    |
| Nit       | Style preference with no behavioral impact                                         | Cap and summarize; do not block                     |

"What Important means" here: a behavior break in agent switching, thread mutation, cron state, review routing, theme persistence, or any policy breach.

## 5. What not to report

- Generated files or build output.
- Pre-existing lint warnings already tracked by the repository.
- Formatting that `prettier` owns.
- Nits beyond the cap of five; summarize the rest in one comment.
- Anything CI already enforces with a failing check.

## 6. Nit cap

Report at most five nits. Summarize the rest as "additional minor style points" without line-by-line comments.

## 7. Required PR evidence

Include in the PR description:

- the artifact chain: intent, design, plan;
- screenshots for light and dark themes when UI changes;
- commands run and results;
- API endpoints exercised;
- known limitations, especially the runs cap and missing committed E2E tests;
- rollback plan for destructive behavior.

## 8. Human approval gates

The following still require a human code owner:

- production deployment authorization;
- changes to auth, secrets, or protected paths;
- any change that would let the UI approve a high-risk action without the existing review surface;
- dependency or license changes;
- removal or weakening of a test or gate.

Express non-negotiable checks as hooks or CI, not only as review comments. Review comments are advisory; hooks are deterministic.

## 9. Agent review prompt

```text
Review this PR against docs/intent.md, docs/design.md, docs/plan.md, and docs/review.md.
Run the automated gates. Do not approve the PR.
Report findings by severity: Critical, Important, Minor, Nit.
Cap nits at five and summarize the rest.
Explicitly verify:
1. agent switch clears threadId and remounts the stream;
2. rename preserves metadata and rejects empty titles;
3. delete waits for server success and clears the active thread;
4. cron mutations roll back on failure;
5. runs queries remain bounded to 12 threads and 5 runs per thread;
6. reviews only navigate to the existing approval surface;
7. theme has no hydration mismatch and both themes are readable;
8. no secret or API key is logged or committed.
If evidence is missing, request it instead of assuming success.
```
