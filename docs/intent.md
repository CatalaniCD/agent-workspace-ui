# Intent: Agent Workspace operations, themes, and conversation controls

Author: Agent Workspace team  
Status: accepted, implemented  
Date: 2026-10-26  
Related: [design.md](./design.md) · [plan.md](./plan.md) · [review.md](./review.md) · [testing.md](./testing.md)

## Problem

The reference chat UI is optimized for a single conversation with a single graph. Operators who use LangGraph deployments for content work need to:

- switch between assistants / graphs without editing environment variables;
- find, rename, and remove conversations;
- see scheduled cron runs, recent runs, and threads paused on human-in-the-loop interrupts;
- approve or reject interrupts in context;
- use the product comfortably in light or dark environments.

Today those tasks require bouncing between the chat UI and direct API calls. That makes routine operations slower and makes review queues easy to miss.

## Proposed outcome

One agent workspace where an operator can:

1. select an assistant or graph from the deployment;
2. create, rename, and delete conversations;
3. schedule recurring runs and enable, pause, or delete them;
4. scan recent run status and jump into the related conversation;
5. see every interrupted thread and complete its review;
6. switch between light and dark themes with a single control.

The workspace remains a thin client over the LangGraph SDK. No server-side data store or backend changes are required.

## Affected users and systems

| User / system             | Impact                                                           |
| ------------------------- | ---------------------------------------------------------------- |
| Content operator          | Switches agents, manages conversations, monitors scheduled work  |
| Reviewer / approver       | Finds paused runs and submits approve, reject, or edit decisions |
| Engineer / platform owner | Gets a single UI for debugging runs and cron state               |
| Next.js client            | New providers, URL state, operations sheet, theme provider       |
| LangGraph server          | Existing assistants, threads, runs, and cron endpoints are used  |
| Browser storage           | `next-themes` preference; API key behavior is unchanged          |

## Constraints

- Work inside this repository only; no sibling services or backend code.
- Use the existing `@langchain/langgraph-sdk` client and its existing endpoints.
- Do not weaken the existing human approval flow for production actions.
- Destructive actions require explicit confirmation.
- The UI must remain responsive at the existing desktop and mobile breakpoints.
- Theme support must not cause hydration mismatches or flash the wrong theme.
- API keys remain client-side only. No secret may be committed or logged.
- Large workspaces must not make the operations sheet issue unbounded requests.

## Success measures

Leading indicators:

- time from opening the workspace to selecting the right agent;
- time from opening Operations to locating a paused review;
- time to rename or delete a conversation;
- number of theme-related hydration or contrast issues.

Lagging indicators:

- review completion rate for interrupted runs;
- repeat operational requests that bypass the UI;
- rework caused by acting on the wrong agent or thread;
- user-reported accessibility issues in light or dark mode.

## Decisions already made

- Agent selection uses `assistants.search`; a graph ID remains a valid fallback.
- Switching agents clears `threadId`, because thread lists are agent-scoped.
- Thread titles are stored in thread metadata under `title`.
- Reviews are discovered with `threads.search({ status: "interrupted" })`.
- The operations surface is a right-side sheet, not a new route.
- `operationsOpen` and `operationsTab` live in the URL so the view is shareable.
- Theme preference uses `next-themes` with `attribute="class"` and system default.

## Open questions

- Should the runs tab paginate beyond the twelve most recently updated threads?
- Should reviewers be able to claim or assign a paused thread?
- Do regulated deployments require role-based visibility for the operations sheet?
- Should the selected agent be persisted per user rather than kept in the URL?

## Out of scope

- Backend or LangGraph server changes.
- New authentication or role-based authorization.
- Multi-tenant isolation guarantees.
- Reworking the agent-inbox approval semantics.
- Automated browser tests committed to the repository (tracked in [testing.md](./testing.md)).
