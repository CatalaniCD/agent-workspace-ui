import { Message, Thread } from "@langchain/langgraph-sdk";
import { validate } from "uuid";

export function getThreadSearchMetadata(
  assistantId: string,
): { graph_id: string } | { assistant_id: string } {
  if (validate(assistantId)) {
    return { assistant_id: assistantId };
  }
  return { graph_id: assistantId };
}

function contentToString(content: Message["content"]): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter(
      (block): block is { type: "text"; text: string } =>
        typeof block === "object" &&
        block !== null &&
        "type" in block &&
        block.type === "text" &&
        "text" in block &&
        typeof block.text === "string",
    )
    .map((block) => block.text)
    .join(" ");
}

export function getThreadTitle(thread: Thread): string {
  for (const key of ["title", "thread_name", "name"]) {
    const value = thread.metadata?.[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  const values = thread.values;
  if (
    typeof values === "object" &&
    values !== null &&
    !Array.isArray(values) &&
    "messages" in values
  ) {
    const messages = (values as { messages?: Message[] }).messages;
    const firstMessage = messages?.[0];
    if (firstMessage) {
      const text = contentToString(firstMessage.content).trim();
      if (text.length > 0) return text;
    }
  }

  return thread.thread_id;
}
