import { Assistant, SearchItem } from "@langchain/langgraph-sdk";
import { format, isValid, parseISO } from "date-fns";
import { validate } from "uuid";

export const SCRATCHPAD_NAMESPACE_PREFIX = "notes";

const NOTE_KEY_PATTERN = /^\/(\d{4}-\d{2}-\d{2})\.md$/;

export interface ScratchpadNote {
  key: string;
  dateKey: string;
  content: string;
  updatedAt: string | null;
}

export function getScratchpadGraphId(
  agents: Assistant[],
  selectedAgentId: string,
): string | null {
  if (!selectedAgentId) return null;

  const selectedAgent =
    agents.find((agent) => agent.assistant_id === selectedAgentId) ??
    agents.find((agent) => agent.graph_id === selectedAgentId);

  if (selectedAgent?.graph_id) return selectedAgent.graph_id;

  // UUID-shaped IDs are assistant IDs, so wait for the agent list to resolve
  // them to a graph ID. Non-UUID IDs are graph IDs used as a fallback.
  return validate(selectedAgentId) ? null : selectedAgentId;
}

export function getScratchpadNamespace(graphId: string): string[] {
  return [SCRATCHPAD_NAMESPACE_PREFIX, graphId];
}

export function getNoteDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function getNoteKey(dateKey: string): string {
  return `/${dateKey}.md`;
}

export function formatNoteDate(dateKey: string): string {
  const date = parseISO(dateKey);
  return isValid(date) ? format(date, "PPPP") : dateKey;
}

export function parseScratchpadNote(item: SearchItem): ScratchpadNote | null {
  const match = NOTE_KEY_PATTERN.exec(item.key);
  if (!match) return null;

  const encoding = item.value.encoding;
  if (typeof encoding === "string" && encoding !== "utf-8") return null;

  const content = item.value.content;
  if (typeof content !== "string") return null;

  const modifiedAt = item.value.modified_at;

  return {
    key: item.key,
    dateKey: match[1],
    content,
    updatedAt:
      typeof modifiedAt === "string" ? modifiedAt : (item.updatedAt ?? null),
  };
}

export function parseScratchpadNotes(items: SearchItem[]): ScratchpadNote[] {
  return items
    .map(parseScratchpadNote)
    .filter((note): note is ScratchpadNote => note !== null)
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}
