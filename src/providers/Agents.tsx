import { Assistant } from "@langchain/langgraph-sdk";
import { useQueryState } from "nuqs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { useThreads } from "./Thread";

interface AgentsContextType {
  agents: Assistant[];
  agentsLoading: boolean;
  agentsError: string | null;
  refreshAgents: () => Promise<void>;
  selectAgent: (assistantId: string) => void;
  selectedAgentId: string;
}

const AgentsContext = createContext<AgentsContextType | undefined>(undefined);

export function AgentsProvider({ children }: { children: ReactNode }) {
  const { client } = useThreads();
  const envAssistantId = process.env.NEXT_PUBLIC_ASSISTANT_ID;
  const [assistantId, setAssistantId] = useQueryState("assistantId");
  const [, setThreadId] = useQueryState("threadId");
  const [agents, setAgents] = useState<Assistant[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsError, setAgentsError] = useState<string | null>(null);

  const selectedAgentId = assistantId || envAssistantId || "";

  const refreshAgents = useCallback(async (): Promise<void> => {
    if (!client) {
      setAgents([]);
      setAgentsError(null);
      return;
    }

    setAgentsLoading(true);
    setAgentsError(null);
    try {
      const nextAgents = await client.assistants.search({ limit: 100 });
      setAgents(nextAgents);
    } catch (error) {
      console.error("Failed to load agents", error);
      setAgentsError("Could not load agents from this deployment.");
    } finally {
      setAgentsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void refreshAgents();
  }, [refreshAgents]);

  const selectAgent = useCallback(
    (nextAssistantId: string) => {
      setAssistantId(nextAssistantId);
      setThreadId(null);
    },
    [setAssistantId, setThreadId],
  );

  const value = useMemo(
    () => ({
      agents,
      agentsLoading,
      agentsError,
      refreshAgents,
      selectAgent,
      selectedAgentId,
    }),
    [
      agents,
      agentsLoading,
      agentsError,
      refreshAgents,
      selectAgent,
      selectedAgentId,
    ],
  );

  return (
    <AgentsContext.Provider value={value}>{children}</AgentsContext.Provider>
  );
}

export function useAgents() {
  const context = useContext(AgentsContext);
  if (context === undefined) {
    throw new Error("useAgents must be used within an AgentsProvider");
  }
  return context;
}
