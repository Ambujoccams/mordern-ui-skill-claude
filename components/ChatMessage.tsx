"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Message, Artifact } from "@/lib/types";
import { CodeBlock } from "./CodeBlock";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: Message;
  isDark: boolean;
  onOpenArtifact?: (artifact: Artifact) => void;
  onRegenerate?: () => void;
}

/* Pulsing dots while assistant is "thinking" */
function StreamingDots() {
  return (
    <div className="flex gap-1.5 items-center py-1 px-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full bg-primary/50"
          animate={{ scale: [1, 1.35, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
  );
}

/* Small Claude logo mark used as assistant avatar */
function ClaudeMark() {
  return (
    <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-primary">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
      </svg>
    </div>
  );
}

export function ChatMessage({ message, isDark, onOpenArtifact, onRegenerate }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);

  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="group flex justify-end px-4 py-2"
      >
        <div className="max-w-[75%] flex flex-col items-end gap-1">
          {/* Warm cream bubble — like Claude's user message */}
          <div className="bg-[oklch(0.93_0.022_74)] border border-[oklch(0.875_0.022_72)] rounded-2xl rounded-br-md px-4 py-3 text-[14.5px] leading-relaxed text-foreground">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
          {/* Edit action on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-muted-foreground">{formatTime(message.timestamp)}</span>
            <button className="p-1 rounded hover:bg-muted transition-colors">
              <Pencil className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  /* ── Assistant message ── */
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className="group flex gap-3 px-4 py-3"
    >
      {/* Claude mark avatar */}
      <div className="mt-0.5 shrink-0">
        <ClaudeMark />
      </div>

      {/* Content — no bubble, just text on cream bg */}
      <div className="flex-1 min-w-0 max-w-[88%]">
        <p className="text-[12px] font-semibold text-foreground/60 mb-1.5">Claude</p>

        {message.isStreaming ? (
          <StreamingDots />
        ) : (
          <div className="text-[14.5px] leading-relaxed text-foreground prose-sm">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const codeStr = String(children).replace(/\n$/, "");
                  if (match) {
                    return (
                      <CodeBlock code={codeStr} language={match[1]} isDark={isDark} />
                    );
                  }
                  return (
                    <code
                      className="bg-muted border border-border px-1.5 py-0.5 rounded text-[13px] font-mono text-foreground/90"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
                p: ({ children }) => (
                  <p className="mb-3 last:mb-0 text-foreground/90">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-5 mb-3 space-y-1 text-foreground/90">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-5 mb-3 space-y-1 text-foreground/90">{children}</ol>
                ),
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                h1: ({ children }) => (
                  <h1 className="text-xl font-bold mb-3 mt-2 text-foreground">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-base font-semibold mb-2 mt-4 text-foreground">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-semibold mb-1.5 mt-3 text-foreground">{children}</h3>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-primary/40 pl-4 italic text-muted-foreground my-2">
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3 rounded-lg border border-border">
                    <table className="text-sm border-collapse w-full">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border-b border-border px-3 py-2 bg-muted font-medium text-left text-xs">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border-b border-border/50 px-3 py-2 text-sm last-row:border-0">
                    {children}
                  </td>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">{children}</strong>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    className="text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Artifact preview card */}
        {message.artifact && onOpenArtifact && !message.isStreaming && (
          <motion.button
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => onOpenArtifact(message.artifact!)}
            className="mt-3 flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white border border-border hover:border-primary/40 hover:shadow-sm transition-all text-left w-full max-w-sm group/artifact"
          >
            {/* Icon */}
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-primary text-sm font-mono font-bold">
                {message.artifact.type === "code"
                  ? "{}"
                  : message.artifact.type === "document"
                  ? "≡"
                  : "⊞"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {message.artifact.title}
              </p>
              <p className="text-xs text-muted-foreground capitalize">{message.artifact.type}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover/artifact:text-primary transition-colors shrink-0" />
          </motion.button>
        )}

        {/* Action row — visible on hover */}
        {!message.isStreaming && (
          <div className="flex items-center gap-0.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-muted-foreground mr-1.5">
              {formatTime(message.timestamp)}
            </span>
            <ActionBtn onClick={handleCopy} title="Copy">
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </ActionBtn>
            <ActionBtn onClick={() => setLiked(true)} title="Good response">
              <ThumbsUp
                className={cn("w-3.5 h-3.5", liked === true ? "text-primary fill-primary/20" : "")}
              />
            </ActionBtn>
            <ActionBtn onClick={() => setLiked(false)} title="Bad response">
              <ThumbsDown
                className={cn("w-3.5 h-3.5", liked === false ? "text-red-500 fill-red-100" : "")}
              />
            </ActionBtn>
            {onRegenerate && (
              <ActionBtn onClick={onRegenerate} title="Regenerate">
                <RotateCcw className="w-3.5 h-3.5" />
              </ActionBtn>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ActionBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {children}
    </button>
  );
}
