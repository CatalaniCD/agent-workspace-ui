import { getApiKey } from "@/lib/api-key";
import { resolveApiUrl } from "@/lib/resolve-api-url";
import { getThreadSearchMetadata } from "@/lib/threads";
import { Client, Thread } from "@langchain/langgraph-sdk";
import { useQueryState } from "nuqs";
import {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useMemo,
  useState,
  Dispatch,
  SetStateAction,
} from "react";
import { createClient } from "./client";

interface ThreadContextType {
  getThreads: () => Promise<Thread[]>;
  refreshThreads: () => Promise<void>;
  renameThread: (threadId: string, title: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  client: Client | null;
  threads: Thread[];
  setThreads: Dispatch<SetStateAction<Thread[]>>;
  threadsLoading: boolean;
  setThreadsLoading: Dispatch<SetStateAction<boolean>>;
}

const ThreadContext = createContext<ThreadContextType | undefined>(undefined);

export function ThreadProvider({ children }: { children: ReactNode }) {
  const envApiUrl: string | undefined = process.env.NEXT_PUBLIC_API_URL;
  const envAssistantId: string | undefined =
    process.env.NEXT_PUBLIC_ASSISTANT_ID;
  const envAuthScheme: string | undefined = process.env.NEXT_PUBLIC_AUTH_SCHEME;

  const [apiUrl] = useQueryState("apiUrl", {
    defaultValue: envApiUrl || "",
  });
  const [assistantId] = useQueryState("assistantId");
  const [authScheme] = useQueryState("authScheme", {
    defaultValue: envAuthScheme || "",
  });
  const [threadId, setThreadId] = useQueryState("threadId");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);

  const finalApiUrl = resolveApiUrl(apiUrl, envApiUrl);
  const resolvedAssistantId = assistantId || envAssistantId;
  const finalAuthScheme = authScheme || envAuthScheme || "";

  const client = useMemo(() => {
    if (!finalApiUrl) return null;
    return createClient(
      finalApiUrl,
      getApiKey(finalApiUrl) ?? undefined,
      finalAuthScheme || undefined,
    );
  }, [finalApiUrl, finalAuthScheme]);

  const getThreads = useCallback(async (): Promise<Thread[]> => {
    if (!client || !resolvedAssistantId) return [];

    return client.threads.search({
      metadata: {
        ...getThreadSearchMetadata(resolvedAssistantId),
      },
      limit: 100,
    });
  }, [client, resolvedAssistantId]);

  const refreshThreads = useCallback(async (): Promise<void> => {
    setThreadsLoading(true);
    try {
      const nextThreads = await getThreads();
      setThreads(nextThreads);
    } catch (error) {
      console.error("Failed to load threads", error);
    } finally {
      setThreadsLoading(false);
    }
  }, [getThreads]);

  const renameThread = useCallback(
    async (threadId: string, title: string): Promise<void> => {
      if (!client) {
        throw new Error("Not connected to a LangGraph deployment.");
      }

      const thread = threads.find((item) => item.thread_id === threadId);
      const metadata = {
        ...(thread?.metadata ?? {}),
        title,
      };

      await client.threads.update(threadId, { metadata });
      setThreads((prev) =>
        prev.map((item) =>
          item.thread_id === threadId
            ? { ...item, metadata: { ...item.metadata, title } }
            : item,
        ),
      );
    },
    [client, threads],
  );

  const deleteThread = useCallback(
    async (id: string): Promise<void> => {
      if (!client) {
        throw new Error("Not connected to a LangGraph deployment.");
      }

      await client.threads.delete(id);
      setThreads((prev) => prev.filter((item) => item.thread_id !== id));
      if (threadId === id) {
        setThreadId(null);
      }
    },
    [client, setThreadId, threadId],
  );

  const value = {
    getThreads,
    refreshThreads,
    renameThread,
    deleteThread,
    client,
    threads,
    setThreads,
    threadsLoading,
    setThreadsLoading,
  };

  return (
    <ThreadContext.Provider value={value}>{children}</ThreadContext.Provider>
  );
}

export function useThreads() {
  const context = useContext(ThreadContext);
  if (context === undefined) {
    throw new Error("useThreads must be used within a ThreadProvider");
  }
  return context;
}
