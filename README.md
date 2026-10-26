# Agent Workspace

![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)
![LangGraph SDK](https://img.shields.io/badge/LangGraph-SDK-1c3d5a)
![License: MIT](https://img.shields.io/badge/License-MIT-green)

Agent Workspace is a Next.js operations UI for **Aegra**, the backend server that hosts your agents and graph workflows. It combines a streaming chat client with the day-to-day controls an operator needs: agent selection, conversation management, scheduled jobs, run monitoring, human-in-the-loop review, and light/dark themes.

The LangGraph SDK connects to Aegra's LangGraph-compatible API. You can point the same UI at another compatible deployment by changing `NEXT_PUBLIC_API_URL`.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./docs/images/ui-dark.png">
  <img src="./docs/images/ui-light.png" alt="Agent Workspace in light mode">
</picture>

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Using the workspace](#using-the-workspace)
- [Development](#development)
- [Documentation](#documentation)
- [Production](#production)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Agent selection** — discover assistants from the deployment and switch graphs without editing environment variables.
- **Conversation management** — rename threads inline and delete them with confirmation.
- **Scheduled jobs** — create cron-based runs, set a timezone and optional end time, pause or enable tasks, and delete them.
- **Scheduling guide** — an in-product walkthrough covering cron fields, examples, timezones, and safe defaults.
- **Runs dashboard** — scan recent runs across the selected agent, filter by status, and open the related thread.
- **Review queue** — find threads paused on a human-in-the-loop interrupt and open them in the existing approval flow.
- **Themes** — light, dark, or system, with a persistent toggle.
- **Streaming chat** — messages, tool calls, artifacts, and interrupts use the existing LangGraph SDK behavior.

## Architecture

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./docs/images/architecture-dark.png">
  <img src="./docs/images/architecture.png" alt="Architecture: the Next.js UI calls the LangGraph SDK, which talks to Aegra's LangGraph-compatible API for assistants, threads, runs, crons, and streaming.">
</picture>

The UI keeps no application database. URL state (`apiUrl`, `assistantId`, `threadId`, `operationsOpen`, `operationsTab`) drives navigation, while the LangGraph SDK talks directly to Aegra. Aegra hosts the agents and graph workflows and exposes the assistants, threads, runs, crons, and streaming endpoints.

| UI action              | Aegra / LangGraph API call                  |
| ---------------------- | ------------------------------------------- |
| Load agents            | `assistants.search`                         |
| Load threads           | `threads.search`                            |
| Rename thread          | `threads.update`                            |
| Delete thread          | `threads.delete`                            |
| List or create crons   | `crons.search`, `crons.create`              |
| Enable or delete crons | `crons.update`, `crons.delete`              |
| Recent runs            | `runs.list` per thread                      |
| Review queue           | `threads.search({ status: "interrupted" })` |

See [docs/design.md](./docs/design.md) for the full component map, review handoff, and tradeoffs.

## Tech stack

| Layer               | Technology                                                   |
| ------------------- | ------------------------------------------------------------ |
| Framework           | Next.js 16 App Router, React 19, TypeScript                  |
| Styling             | Tailwind CSS 4, Radix UI primitives, shadcn-style components |
| State and URL       | React context providers, `nuqs`                              |
| Backend             | Aegra, with a LangGraph-compatible API                       |
| Client              | `@langchain/langgraph-sdk`                                   |
| Themes              | `next-themes`                                                |
| Motion and feedback | Framer Motion, Sonner                                        |

## Requirements

- Node.js 20 or newer
- pnpm
- A running Aegra server, or another LangGraph-compatible deployment, whose graph state includes a `messages` key

## Quick start

```bash
pnpm install
cp .env.example .env
```

Start Aegra with your agents and graph workflows, then set its URL and the agent or graph ID in `.env`:

```bash
# Aegra server URL
NEXT_PUBLIC_API_URL=http://localhost:2024

# Agent or graph ID hosted by Aegra
NEXT_PUBLIC_ASSISTANT_ID=agent
```

Start the app:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). If you do not set the environment variables, the app shows a setup form where you can enter the Aegra URL, agent or graph ID, and optional credentials. The setup form can also load the available agents from Aegra.

## Configuration

| Variable                   | Required               | Purpose                                                                                          |
| -------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_API_URL`      | Yes                    | Aegra server URL, another LangGraph-compatible URL, or your own `/api` passthrough in production |
| `NEXT_PUBLIC_ASSISTANT_ID` | Yes                    | Agent UUID or graph ID hosted by Aegra                                                           |
| `NEXT_PUBLIC_AUTH_SCHEME`  | No                     | Set to `langsmith-api-key` only for LangSmith Agent Builder deployments                          |
| `LANGSMITH_API_KEY`        | Server-side only       | Injected by the API passthrough when required; never prefix with `NEXT_PUBLIC_`                  |
| `LANGGRAPH_API_URL`        | Production passthrough | The upstream Aegra or LangGraph-compatible URL                                                   |

The selected agent, active thread, and operations view are stored in the URL. The API key is handled by the existing client credentials helpers and must never be committed.

## Using the workspace

### Select an agent

Use the agent dropdown in the header. Switching agents clears the active conversation and reloads the thread list and operations for the new agent.

### Manage conversations

- **New thread** — click the compose icon in the header.
- **Rename** — click the pencil icon on a thread, edit the name, and press Enter or the check button.
- **Delete** — click the trash icon and confirm. Deleting the active thread resets the chat.

Thread titles are stored in thread metadata under `title`. If no title is stored, the UI falls back to `thread_name`, `name`, the first human message, then the thread ID.

### Scheduled jobs

Open **Operations → Scheduled** and click **New task**.

1. Select the agent that should run the job.
2. Name the task.
3. Enter a five-field cron expression or choose a preset.
4. Set the timezone (IANA names such as `America/New_York`).
5. Write a self-contained prompt. It becomes the first human message of every run.
6. Optionally set an end time.
7. Choose whether the thread is kept after the run.
8. Create the task and confirm it appears with the expected next run.

Common schedules:

| Expression     | Meaning                              |
| -------------- | ------------------------------------ |
| `0 9 * * *`    | Every day at 09:00                   |
| `0 9 * * 1-5`  | Weekdays at 09:00                    |
| `0 * * * *`    | Every hour                           |
| `*/15 * * * *` | Every 15 minutes                     |
| `30 17 * * 5`  | Fridays at 17:30                     |
| `0 9 1 * *`    | The first day of each month at 09:00 |

Cron fields are minute, hour, day of month, month, and day of week. There is no seconds field. Use the **How to schedule jobs** button in Operations for the full walkthrough.

### Runs

Open **Operations → Runs** to see recent runs across the selected agent. The dashboard is bounded to the twelve most recently updated threads and five runs per thread to keep requests predictable. Filter by status or open the related conversation.

### Reviews

Open **Operations → Reviews** to see threads paused on a human-in-the-loop interrupt. Selecting a review closes Operations and opens the thread, where the existing approval surface handles approve, reject, and edit decisions. The review queue discovers work; it does not bypass the approval flow.

### Themes and text size

Use the moon/sun button in the header or setup form. The default is the system theme, persisted by `next-themes`.

Use the **T** button in the workspace header to choose Small, Default, or Large text. The choice is persisted in `localStorage` and applies immediately on the next load.

## Project structure

```text
src/
  app/                    Next.js app shell and API passthrough route
  components/
    agents/               Agent selector
    operations/           Scheduled, runs, reviews, and scheduling guide
    thread/               Chat, history, messages, artifacts, agent inbox
    ui/                   Shared Radix-based primitives
  lib/                    Thread helpers, API URL, credentials, utilities
  providers/              Thread, agents, stream, and client state
docs/
  intent.md               Problem, outcome, constraints
  design.md               Architecture, flows, API surface, tradeoffs
  plan.md                 Delivery phases and verification
  review.md               PR review policy and gates
  testing.md              Test matrix and continuous evals
  diagrams/               Mermaid sources
  images/                 Rendered diagrams and UI screenshots
```

## Development

```bash
pnpm dev          # start the development server
pnpm build        # production build
pnpm start        # start the production server
pnpm lint         # ESLint
pnpm lint:fix     # ESLint with fixes
pnpm format       # Prettier
pnpm format:check # Prettier check
pnpm exec tsc --noEmit
```

Lint currently reports warnings only. Treat new errors as blocking. See [docs/testing.md](./docs/testing.md) for the smoke matrix and the planned Playwright and continuous-eval coverage.

## Documentation

- [Intent](./docs/intent.md)
- [Design](./docs/design.md)
- [Plan](./docs/plan.md)
- [Review policy](./docs/review.md)
- [Testing and verification](./docs/testing.md)

Diagrams are available in light and dark variants under [docs/images](./docs/images). Sources live in [docs/diagrams](./docs/diagrams).

## Production

The default setup connects to Aegra directly from the browser. For production, proxy requests if Aegra or your deployment requires server-side credentials.

### API passthrough quickstart

This repository includes the passthrough route at `src/app/api/[..._path]/route.ts`. Configure:

```bash
NEXT_PUBLIC_ASSISTANT_ID="agent"
LANGGRAPH_API_URL="https://your-aegra-server.example.com"
NEXT_PUBLIC_API_URL="https://my-website.com/api"
LANGSMITH_API_KEY="lsv2_..." # only if your deployment requires it
```

- `NEXT_PUBLIC_API_URL` points to your site plus `/api`.
- `LANGGRAPH_API_URL` is the upstream Aegra server.
- `LANGSMITH_API_KEY` stays server-side and is injected by the proxy when required.

> [!WARNING]
> The API passthrough does not authenticate its callers. If you expose it with a LangSmith key and no gate of your own, anyone who reaches the URL can read, modify, and delete threads and store items, and start runs billed to your account. Add authentication before deploying, or remove the proxy route and use LangGraph custom authentication.

### Custom authentication

For stronger control, configure custom authentication on Aegra or your LangGraph-compatible deployment, set `NEXT_PUBLIC_API_URL` to the deployment URL, and pass the user's token through the stream client's `defaultHeaders` in `src/providers/Stream.tsx`.

## Message rendering

To prevent live streaming for a model, add the `langsmith:nostream` tag to its config. To hide a message permanently, prefix its ID with `do-not-render-` before saving it to graph state. The UI filters IDs with this prefix.

## Artifacts

Artifacts render in the side panel. Graph code can attach an artifact component and open state through the thread metadata `artifact` field; the UI exposes it through the artifact context in `src/components/thread/artifact.tsx`.

## Known limitations

- The runs dashboard is capped at twelve threads and five runs per thread; pagination is a follow-up.
- The review queue is limited to fifty interrupted threads.
- Cron editing is not supported; create, pause, enable, and delete are.
- Committed browser regression tests are not present yet.
- The browser tab icon was intentionally removed.

## Troubleshooting

| Symptom                                 | Checks                                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Agent list is empty                     | Confirm `NEXT_PUBLIC_API_URL` and that `GET /info` responds. Check credentials or `NEXT_PUBLIC_AUTH_SCHEME` for Agent Builder deployments. |
| Thread history is empty                 | Confirm the selected assistant or graph is the one that owns the threads. Switching agents scopes the list.                                |
| A cron is missing                       | Confirm the correct agent is selected, the task is enabled, and the schedule is a valid five-field expression.                             |
| A cron did not run                      | Check the Runs tab and the deployment logs. Verify the timezone and the optional end time.                                                 |
| A review is missing                     | Only threads with `status: "interrupted"` appear. The queue shows up to fifty threads.                                                     |
| Runs look incomplete                    | The dashboard loads the twelve most recently updated threads and five runs per thread. Open a thread for its full run history.             |
| Theme is wrong on first paint           | The default is the system theme. Toggle once to persist an explicit preference.                                                            |
| API requests return 401/403             | Check the LangSmith key, auth scheme, or custom authentication headers in `src/providers/Stream.tsx`.                                      |
| Build reports a Tailwind config warning | This is a pre-existing ESM/CommonJS warning from `tailwind.config.js`; it does not fail the build.                                         |

## Contributing

1. Read [docs/intent.md](./docs/intent.md), [docs/design.md](./docs/design.md), and [docs/plan.md](./docs/plan.md).
2. Keep changes within the current artifact's scope, or update the design in the same PR.
3. Run `pnpm exec tsc --noEmit`, `pnpm run lint`, and `pnpm run build`.
4. For UI changes, include light and dark screenshots and the API endpoints exercised.
5. Follow [docs/review.md](./docs/review.md). Do not commit `.env` files, API keys, or generated build output.

## License

MIT. The original copyright notice is preserved in [LICENSE](./LICENSE). This project is based on [langchain-ai/agent-chat-ui](https://github.com/langchain-ai/agent-chat-ui) and has been modified into Agent Workspace.
