import { ChevronRight, X, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import {
  baseMessageObject,
  isArrayOfMessages,
  prettifyText,
  unknownToPrettyDate,
} from "../utils";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BaseMessage } from "@langchain/core/messages";
import { ToolCall } from "@langchain/core/messages/tool";
import { ToolCallTable } from "./tool-call-table";
import { Button } from "@/components/ui/button";
import { MarkdownText } from "../../markdown-text";

interface StateViewRecursiveProps {
  value: unknown;
  expanded?: boolean;
}

const messageTypeToLabel = (message: BaseMessage) => {
  let type = "";
  if ("type" in message) {
    type = message.type as string;
  } else if ("getType" in message) {
    type = (message as BaseMessage).getType();
  }

  switch (type) {
    case "human":
      return "User";
    case "ai":
      return "Assistant";
    case "tool":
      return "Tool";
    case "System":
      return "System";
    default:
      return "";
  }
};

function MessagesRenderer({ messages }: { messages: BaseMessage[] }) {
  return (
    <div className="flex w-full flex-col gap-1">
      {messages.map((msg, idx) => {
        const messageTypeLabel = messageTypeToLabel(msg);
        const content =
          typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content, null);
        return (
          <div
            key={msg.id ?? `message-${idx}`}
            className="ml-2 flex w-full flex-col gap-[2px]"
          >
            <p className="text-foreground font-medium">{messageTypeLabel}:</p>
            {content && <MarkdownText>{content}</MarkdownText>}
            {"tool_calls" in msg && msg.tool_calls ? (
              <div className="flex w-full flex-col items-start gap-1">
                {(msg.tool_calls as ToolCall[]).map((tc, idx) => (
                  <ToolCallTable
                    key={tc.id ?? `tool-call-${idx}`}
                    toolCall={tc}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function StateViewRecursive(props: StateViewRecursiveProps) {
  const date = unknownToPrettyDate(props.value);
  if (date) {
    return <p className="text-muted-foreground font-light">{date}</p>;
  }

  if (["string", "number"].includes(typeof props.value)) {
    return <MarkdownText>{props.value as string}</MarkdownText>;
  }

  if (typeof props.value === "boolean") {
    return <MarkdownText>{JSON.stringify(props.value)}</MarkdownText>;
  }

  if (props.value == null) {
    return (
      <p className="text-muted-foreground font-light whitespace-pre-wrap">
        null
      </p>
    );
  }

  if (Array.isArray(props.value)) {
    if (props.value.length > 0 && isArrayOfMessages(props.value)) {
      return <MessagesRenderer messages={props.value} />;
    }

    const valueArray = props.value as unknown[];
    return (
      <div className="flex w-full flex-row items-start justify-start gap-1">
        <span className="text-foreground font-normal">[</span>
        {valueArray.map((item, idx) => {
          const itemRenderValue = baseMessageObject(item);
          return (
            <div
              key={`state-view-${idx}`}
              className="flex w-full flex-row items-start whitespace-pre-wrap"
            >
              <StateViewRecursive value={itemRenderValue} />
              {idx < valueArray?.length - 1 && (
                <span className="text-foreground font-normal">,&nbsp;</span>
              )}
            </div>
          );
        })}
        <span className="text-foreground font-normal">]</span>
      </div>
    );
  }

  if (typeof props.value === "object") {
    if (Object.keys(props.value).length === 0) {
      return <p className="text-muted-foreground font-light">{"{}"}</p>;
    }
    return (
      <div className="relative ml-6 flex w-full flex-col items-start justify-start gap-1">
        {/* Vertical line */}
        <div className="bg-border absolute top-0 left-[-24px] h-full w-[1px]" />

        {Object.entries(props.value).map(([key, value], idx) => (
          <div
            key={`state-view-object-${key}-${idx}`}
            className="relative w-full"
          >
            {/* Horizontal connector line */}
            <div className="bg-border absolute top-[10px] left-[-20px] h-[1px] w-[18px]" />
            <StateViewObject
              expanded={props.expanded}
              keyName={key}
              value={value}
            />
          </div>
        ))}
      </div>
    );
  }
}

function HasContentsEllipsis({ onClick }: { onClick?: () => void }) {
  return (
    <span
      onClick={onClick}
      className={cn(
        "rounded-md p-[2px] font-mono text-[10px] leading-3",
        "bg-muted/40 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        "cursor-pointer transition-colors ease-in-out",
        "inline-block -translate-y-[2px]",
      )}
    >
      {"{...}"}
    </span>
  );
}

interface StateViewProps {
  keyName: string;
  value: unknown;
  /**
   * Whether or not to expand or collapse the view
   * @default true
   */
  expanded?: boolean;
}

export function StateViewObject(props: StateViewProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (props.expanded != null) {
      setExpanded(props.expanded);
    }
  }, [props.expanded]);

  return (
    <div className="relative flex flex-row items-start justify-start gap-2 text-sm">
      <motion.div
        initial={false}
        animate={{ rotate: expanded ? 90 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <div
          onClick={() => setExpanded((prev) => !prev)}
          className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex h-5 w-5 cursor-pointer items-center justify-center rounded-md transition-colors ease-in-out"
        >
          <ChevronRight className="h-4 w-4" />
        </div>
      </motion.div>
      <div className="flex w-full flex-col items-start justify-start gap-1">
        <p className="text-foreground font-normal">
          {prettifyText(props.keyName)}{" "}
          {!expanded && (
            <HasContentsEllipsis onClick={() => setExpanded((prev) => !prev)} />
          )}
        </p>
        <motion.div
          initial={false}
          animate={{
            height: expanded ? "auto" : 0,
            opacity: expanded ? 1 : 0,
          }}
          transition={{
            duration: 0.2,
            ease: "easeInOut",
          }}
          style={{ overflow: "hidden" }}
          className="relative w-full"
        >
          <StateViewRecursive
            expanded={props.expanded}
            value={props.value}
          />
        </motion.div>
      </div>
    </div>
  );
}

interface StateViewComponentProps {
  values: Record<string, any>;
  description: string | undefined;
  handleShowSidePanel: (showState: boolean, showDescription: boolean) => void;
  view: "description" | "state";
}

export function StateView({
  handleShowSidePanel,
  view,
  values,
  description,
}: StateViewComponentProps) {
  const [expanded, setExpanded] = useState(false);

  if (!values) {
    return <div>No state found</div>;
  }

  return (
    <div
      className={cn(
        "flex min-w-full flex-row gap-0",
        view === "state" &&
          "border-border border-t-[1px] lg:border-t-[0px] lg:border-l-[1px]",
      )}
    >
      {view === "description" && (
        <div className="pt-6 pb-2">
          <MarkdownText>
            {description ?? "No description provided"}
          </MarkdownText>
        </div>
      )}
      {view === "state" && (
        <div className="flex flex-col items-start justify-start gap-1">
          {Object.entries(values).map(([k, v], idx) => (
            <StateViewObject
              expanded={expanded}
              key={`state-view-${k}-${idx}`}
              keyName={k}
              value={v}
            />
          ))}
        </div>
      )}
      <div className="flex items-start justify-end gap-2">
        {view === "state" && (
          <Button
            onClick={() => setExpanded((prev) => !prev)}
            variant="ghost"
            className="text-muted-foreground"
            size="sm"
          >
            {expanded ? (
              <ChevronsUpDown className="h-4 w-4" />
            ) : (
              <ChevronsDownUp className="h-4 w-4" />
            )}
          </Button>
        )}

        <Button
          onClick={() => handleShowSidePanel(false, false)}
          variant="ghost"
          className="text-muted-foreground"
          size="sm"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
