"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  X,
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
  Code2,
  FileText,
  BarChart2,
  Globe,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Artifact } from "@/lib/types";
import { CodeBlock } from "./CodeBlock";

interface WorkspacePanelProps {
  artifact: Artifact | null;
  isOpen: boolean;
  isDark: boolean;
  onClose: () => void;
  width: number;
  onWidthChange: (w: number) => void;
}

export function WorkspacePanel({
  artifact,
  isOpen,
  isDark,
  onClose,
  width,
  onWidthChange,
}: WorkspacePanelProps) {
  const [activeTab, setActiveTab] = useState<string>("preview");
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleCopy = async () => {
    if (!artifact) return;
    await navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      const startX = e.clientX;
      const startWidth = width;

      const onMove = (ev: MouseEvent) => {
        const delta = startX - ev.clientX;
        const newWidth = Math.max(320, Math.min(800, startWidth + delta));
        onWidthChange(newWidth);
      };
      const onUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [width, onWidthChange]
  );

  const tabIcon = (type: string) => {
    if (type === "code") return <Code2 className="w-3.5 h-3.5" />;
    if (type === "document") return <FileText className="w-3.5 h-3.5" />;
    if (type === "data") return <BarChart2 className="w-3.5 h-3.5" />;
    return <Globe className="w-3.5 h-3.5" />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: isExpanded ? "100%" : width, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="flex h-full border-l border-border bg-white overflow-hidden shrink-0 relative"
          style={{ width: isExpanded ? "100%" : width }}
        >
          {/* Drag handle */}
          <div
            onMouseDown={handleMouseDown}
            className={`absolute left-0 top-0 w-1 h-full cursor-col-resize z-10 hover:bg-primary/30 transition-colors ${isDragging ? "bg-primary/50" : ""}`}
          >
            <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-3 h-8 -ml-1">
              <GripVertical className="w-3 h-3 text-muted-foreground/40" />
            </div>
          </div>

          <div className="flex flex-col w-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0 bg-[oklch(0.978_0.007_78)]">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-6 h-6 rounded-md bg-primary/12 flex items-center justify-center text-primary shrink-0">
                  {artifact && tabIcon(artifact.type)}
                </div>
                <h3 className="text-[13px] font-semibold truncate text-foreground">{artifact?.title ?? "Workspace"}</h3>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Download className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <Minimize2 className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>

            {/* Tabs */}
            {artifact && (
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <TabsList className="rounded-none border-b border-border bg-[oklch(0.978_0.007_78)] h-9 px-4 justify-start gap-0 shrink-0">
                  {artifact.type === "code" && (
                    <TabsTrigger
                      value="preview"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs h-full px-3"
                    >
                      Preview
                    </TabsTrigger>
                  )}
                  <TabsTrigger
                    value={artifact.type}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs h-full px-3 capitalize"
                  >
                    {artifact.type}
                  </TabsTrigger>
                </TabsList>

                {artifact.type === "code" && (
                  <TabsContent value="preview" className="flex-1 overflow-hidden m-0">
                    <div className="h-full flex items-center justify-center bg-muted/30 p-8">
                      <div className="text-center space-y-3">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                          <Globe className="w-6 h-6 text-primary" />
                        </div>
                        <p className="text-sm font-medium">Live Preview</p>
                        <p className="text-xs text-muted-foreground max-w-48">
                          Connect a runtime to see your component rendered here
                        </p>
                        <Button size="sm" variant="outline" className="text-xs">
                          Open in Sandbox
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                )}

                <TabsContent value="code" className="flex-1 overflow-hidden m-0">
                  <ScrollArea className="h-full">
                    <div className="p-4">
                      <CodeBlock
                        code={artifact.content}
                        language={artifact.language ?? "typescript"}
                        isDark={isDark}
                        showHeader={false}
                      />
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="document" className="flex-1 overflow-hidden m-0">
                  <ScrollArea className="h-full">
                    <div className="p-6 max-w-2xl mx-auto">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => (
                            <h1 className="text-2xl font-bold mb-4 pb-2 border-b border-border">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-xl font-semibold mb-3 mt-6">{children}</h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-base font-semibold mb-2 mt-4">{children}</h3>
                          ),
                          p: ({ children }) => (
                            <p className="text-sm leading-relaxed mb-3 text-foreground/90">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc pl-5 mb-3 space-y-1 text-sm">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal pl-5 mb-3 space-y-1 text-sm">{children}</ol>
                          ),
                          table: ({ children }) => (
                            <div className="overflow-x-auto mb-4">
                              <table className="text-sm border-collapse w-full">{children}</table>
                            </div>
                          ),
                          th: ({ children }) => (
                            <th className="border border-border px-4 py-2 bg-muted font-medium text-left text-sm">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="border border-border px-4 py-2 text-sm">{children}</td>
                          ),
                        }}
                      >
                        {artifact.content}
                      </ReactMarkdown>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="data" className="flex-1 overflow-hidden m-0">
                  <ScrollArea className="h-full">
                    <div className="p-4">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({ children }) => (
                            <div className="overflow-x-auto rounded-lg border border-border">
                              <table className="text-sm border-collapse w-full">{children}</table>
                            </div>
                          ),
                          th: ({ children }) => (
                            <th className="border-b border-border px-4 py-2.5 bg-muted font-medium text-left text-xs uppercase tracking-wider text-muted-foreground">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="border-b border-border/50 px-4 py-2.5 text-sm last:border-0">
                              {children}
                            </td>
                          ),
                        }}
                      >
                        {artifact.content}
                      </ReactMarkdown>

                      {/* Decorative chart placeholder */}
                      <div className="mt-6 p-6 rounded-xl border border-border bg-muted/30 flex items-center justify-center">
                        <div className="text-center space-y-2">
                          <BarChart2 className="w-8 h-8 text-muted-foreground mx-auto" />
                          <p className="text-xs text-muted-foreground">
                            Chart visualization available with data connector
                          </p>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
