"use client";

import { useState, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Code2,
  FileText,
  BarChart2,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Message, Artifact } from "@/lib/types";
import { CodeBlock } from "./CodeBlock";
import { InteractiveChoiceCard, parseChoiceCard, stripChoiceBlocks } from "./InteractiveChoiceCard";
import { buildPreviewHtml } from "@/lib/preview";
import { cn } from "@/lib/utils";

const PREVIEWABLE_LANGS = new Set(["tsx", "jsx", "html", "js", "javascript", "ts", "typescript"]);

// ── Streaming content parser ──────────────────────────────────────────────
// Splits raw streaming text into a prose portion (before the first code fence)
// and the code being streamed inside that fence.
function parseStreamingParts(content: string): {
  prose: string;
  lang: string;
  code: string | null;
} {
  const openMatch = content.match(/```(\w[\w-]*)?\n?/);
  if (!openMatch || openMatch.index === undefined) {
    return { prose: content, lang: "", code: null };
  }
  const prose = content.slice(0, openMatch.index).trimEnd();
  const lang = (openMatch[1] ?? "").toLowerCase();
  const afterOpen = content.slice(openMatch.index + openMatch[0].length);
  // Strip trailing closing fence if it arrived already
  const code = afterOpen.replace(/\n```\s*$/, "");
  return { prose, lang, code };
}

// ── Streaming code block ──────────────────────────────────────────────────
// Reuses CodeBlock so streaming code has the same syntax highlighting, header,
// and copy button as final code. A small live indicator replaces the language
// label so the user knows it's still updating.
function StreamingCodeBlock({ lang, code, isDark }: { lang: string; code: string; isDark: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mt-3 relative"
    >
      <CodeBlock code={code || " "} language={lang || "text"} isDark={isDark} />
      {/* Live-streaming indicator — pulsing dot in the header */}
      <div className="absolute top-2.5 right-[72px] flex items-center gap-1.5 pointer-events-none">
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-primary"
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 1.1, repeat: Infinity }}
        />
        <span className="text-[10px] font-medium text-muted-foreground tracking-wide uppercase">live</span>
      </div>
    </motion.div>
  );
}

// ── Table normalizer ──────────────────────────────────────────────────────
// Fixes two common Claude table formats that remark-gfm can't parse:
//   1. Separator lines using + instead of |  e.g. "---+---+---"
//   2. Rows missing the leading/trailing |   e.g. "Col | Col | Col"
function normalizeMarkdown(content: string): string {
  const lines = content.split("\n");
  const out: string[] = [];

  for (const line of lines) {
    const t = line.trim();

    // Separator line with + signs: "----+----+----" → "|---|---|---|"
    if (/^[\-+\s|]+$/.test(t) && t.includes("-") && t.includes("+")) {
      const cols = t.split("+").length - 1;
      if (cols >= 1) {
        out.push("|" + " --- |".repeat(cols + 1));
        continue;
      }
    }

    // Table row missing border pipes: "Col | Col" → "| Col | Col |"
    if (
      t.includes("|") &&
      !t.startsWith("|") &&
      !t.startsWith("`") &&
      !t.startsWith("#") &&
      !t.startsWith(">") &&
      t.split("|").length >= 2
    ) {
      out.push("| " + t + " |");
      continue;
    }

    out.push(line);
  }
  return out.join("\n");
}

interface ChatMessageProps {
  message: Message;
  isDark: boolean;
  onOpenArtifact?: (artifact: Artifact) => void;
  onRegenerate?: () => void;
  onOptionSelect?: (choice: string) => void;
}

// ── Inline preview + open button ─────────────────────────────────────────
const ARTIFACT_ICON: Record<string, React.ReactNode> = {
  code:     <Code2 className="w-3.5 h-3.5" />,
  document: <FileText className="w-3.5 h-3.5" />,
  data:     <BarChart2 className="w-3.5 h-3.5" />,
  preview:  <Globe className="w-3.5 h-3.5" />,
};

function ArtifactCard({ artifact, onOpen }: { artifact: Artifact; onOpen: (a: Artifact) => void }) {
  const [rendered, setRendered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [iframeHeight, setIframeHeight] = useState(320);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lang = artifact.language ?? "tsx";
  const html = artifact.type === "code" ? buildPreviewHtml(artifact.content, lang) : null;
  const isPreviewable = !!html;

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (
        e.source === iframeRef.current?.contentWindow &&
        e.data?.type === "__iframeResize__"
      ) {
        setIframeHeight(Math.max(160, e.data.height as number));
        setRendered(true);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="mt-3 rounded-2xl bg-white overflow-hidden w-full"
    >
      {/* ── Live preview iframe ── */}
      {isPreviewable && (
        <div
          className="w-full overflow-hidden"
          style={{
            height: rendered ? iframeHeight : 320,
            transition: "height 0.35s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <motion.iframe
            ref={iframeRef}
            srcDoc={html!}
            sandbox="allow-scripts"
            className="w-full border-0 bg-[#faf7f2] block"
            style={{ height: iframeHeight }}
            title="Preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: rendered ? 1 : 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          />
        </div>
      )}

      {/* ── Footer toolbar ── */}
      <div className="flex items-center gap-2 px-3.5 py-2 bg-[oklch(0.972_0.008_74)]">
        <span className="text-muted-foreground/45 shrink-0">
          {ARTIFACT_ICON[artifact.type] ?? <Code2 className="w-3.5 h-3.5" />}
        </span>
        <span className="text-[12px] text-foreground/55 flex-1 truncate font-medium">
          {artifact.title}
        </span>

        {artifact.type === "code" && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[11px] font-medium text-foreground/45 hover:text-foreground/70 transition-colors shrink-0 border-r border-border/50 pr-2.5 mr-0.5"
          >
            <Code2 className="w-3 h-3" />
            {expanded ? "Hide code" : "View code"}
          </motion.button>
        )}

        <motion.button
          whileHover={{ x: 1 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => onOpen(artifact)}
          className="flex items-center gap-1 text-[11px] font-semibold text-primary/75 hover:text-primary transition-colors shrink-0"
        >
          Open
          <ChevronRight className="w-3 h-3" />
        </motion.button>
      </div>

      {/* ── Inline code drawer ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-border/50"
          >
            <div className="p-3 bg-[oklch(0.965_0.008_74)] max-h-72 overflow-y-auto">
              <CodeBlock
                code={artifact.content}
                language={artifact.language ?? "tsx"}
                isDark={false}
                showHeader={false}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
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

export const ChatMessage = memo(function ChatMessage({ message, isDark, onOpenArtifact, onRegenerate, onOptionSelect }: ChatMessageProps) {
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
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-foreground/60 mb-1.5">Claude</p>

        {message.isStreaming && !message.content ? (
          <StreamingDots />
        ) : message.isStreaming ? (
          /* Streaming render:
             - Prose (before first ```) → ReactMarkdown on the short slice, cheap.
             - Code (from first ``` onward) → StreamingCodeBlock with live cursor.
             - No raw fence characters ever appear in the UI. */
          <div className="text-[14.5px] leading-relaxed text-foreground prose-sm">
            {(() => {
              const { prose, lang, code } = parseStreamingParts(message.content);
              return (
                <>
                  {prose && (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-3 last:mb-0 text-foreground/90">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-foreground/90">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-foreground/90">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-2 text-foreground">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-4 text-foreground">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-semibold mb-1.5 mt-3 text-foreground">{children}</h3>,
                        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                        a: ({ children, href }) => <a href={href} className="text-primary underline underline-offset-2 hover:text-primary/80">{children}</a>,
                      }}
                    >
                      {normalizeMarkdown(prose)}
                    </ReactMarkdown>
                  )}

                  {code !== null ? (
                    /* Code is streaming — show it live in a styled block */
                    <StreamingCodeBlock lang={lang} code={code} isDark={isDark} />
                  ) : (
                    /* Still in prose — blinking cursor at insertion point */
                    <span className="inline-block w-0.5 h-[1em] bg-foreground/50 ml-0.5 align-middle animate-pulse" />
                  )}
                </>
              );
            })()}
          </div>
        ) : (
          <div className="text-[14.5px] leading-relaxed text-foreground prose-sm">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const lang = match?.[1] ?? "";
                  const codeStr = String(children).replace(/\n$/, "");

                  if (lang === "options") return null;

                  if (match) {
                    // Suppress previewable code — artifact card renders the live
                    // preview instead. During streaming we match by language alone
                    // (artifact isn't extracted yet); after streaming we verify
                    // the content matches so unrelated code blocks still show.
                    if (PREVIEWABLE_LANGS.has(lang)) {
                      if (
                        message.isStreaming ||
                        (message.artifact?.type === "code" &&
                          message.artifact.content.trim() === codeStr.trim())
                      ) {
                        return null;
                      }
                    }
                    return <CodeBlock code={codeStr} language={lang} isDark={isDark} />;
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
                  <div className="overflow-x-auto my-4 rounded-xl border border-border shadow-sm">
                    <table className="text-sm border-collapse w-full">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-[oklch(0.945_0.015_74)]">{children}</thead>
                ),
                tbody: ({ children }) => (
                  <tbody className="divide-y divide-border/40">{children}</tbody>
                ),
                tr: ({ children }) => (
                  <tr className="transition-colors hover:bg-muted/30">{children}</tr>
                ),
                th: ({ children }) => (
                  <th className="px-4 py-2.5 font-semibold text-left text-[11px] uppercase tracking-wider text-foreground/60 border-b border-border">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-2.5 text-[13px] text-foreground/85">
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
              {normalizeMarkdown(stripChoiceBlocks(message.content))}
            </ReactMarkdown>
          </div>
        )}

        {/* Interactive choice card — rendered when Claude emits an ```options block */}
        {!message.isStreaming && (() => {
          const card = parseChoiceCard(message.content);
          if (!card || !onOptionSelect) return null;
          return (
            <InteractiveChoiceCard
              key={message.id + "-card"}
              question={card.question}
              choices={card.choices}
              onSelect={onOptionSelect}
            />
          );
        })()}

        {/* Artifact preview card */}
        {message.artifact && onOpenArtifact && !message.isStreaming && (
          <ArtifactCard artifact={message.artifact} onOpen={onOpenArtifact} />
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
});

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
