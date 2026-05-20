"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
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
  TrendingUp,
  PieChart as PieIcon,
  Globe,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Artifact } from "@/lib/types";
import { CodeBlock } from "./CodeBlock";
import { buildPreviewHtml } from "@/lib/preview";

interface LivePreviewProps {
  code: string;
  language: string;
}

function LivePreview({ code, language }: LivePreviewProps) {
  const [key, setKey] = useState(0);
  const html = buildPreviewHtml(code, language);

  if (!html) {
    const lang = language.toUpperCase();
    return (
      <div className="h-full flex items-center justify-center bg-muted/30">
        <div className="text-center space-y-2">
          <Code2 className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium text-foreground/70">{lang} Preview</p>
          <p className="text-xs text-muted-foreground max-w-52">
            Live preview is available for HTML, CSS, JSX, and TSX components.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-[oklch(0.978_0.007_78)] shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
        </div>
        <button
          onClick={() => setKey((k) => k + 1)}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <Globe className="w-3 h-3" /> Reload
        </button>
      </div>
      {/* iframe */}
      <iframe
        key={key}
        srcDoc={html}
        sandbox="allow-scripts"
        className="flex-1 w-full border-0 bg-white"
        title="Live Preview"
      />
    </div>
  );
}

// ── Markdown table parser ─────────────────────────────────────────────────
function parseMarkdownTable(content: string): { headers: string[]; rows: Record<string, string | number>[] } | null {
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  const tableLines = lines.filter((l) => l.startsWith("|") && l.endsWith("|"));
  if (tableLines.length < 3) return null;

  const headers = tableLines[0]
    .split("|")
    .map((h) => h.trim())
    .filter(Boolean);

  const rows = tableLines.slice(2).map((line) => {
    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    const row: Record<string, string | number> = {};
    headers.forEach((h, i) => {
      const raw = cells[i] ?? "";
      const num = parseFloat(raw.replace(/[,%$]/g, ""));
      row[h] = isNaN(num) ? raw : num;
    });
    return row;
  });

  return { headers, rows };
}

// Warm minimal palette — Claude-style, not a rainbow
const CHART_COLORS = [
  "#c2714f", // terracotta (primary)
  "#5b7fa6", // dusty blue
  "#6b9a76", // sage green
  "#9b7fb0", // muted mauve
  "#b09060", // warm amber
  "#5e8e8e", // slate teal
];

const GRID_COLOR = "#f0f0f0";
const AXIS_TICK = { fontSize: 11, fill: "#94a3b8", fontFamily: "inherit" };

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-lg px-3.5 py-2.5 text-[12px]">
      {label && <p className="font-semibold text-slate-700 mb-2">{label}</p>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 py-0.5">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}</span>
          <span className="font-semibold text-slate-800 ml-auto pl-4">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

type ChartType = "bar" | "line" | "pie";

interface DataChartProps {
  content: string;
}

function DataChart({ content }: DataChartProps) {
  const [chartType, setChartType] = useState<ChartType>("bar");
  const parsed = parseMarkdownTable(content);

  if (!parsed || parsed.rows.length === 0) return null;

  const { headers, rows } = parsed;
  const labelKey = headers[0];
  const valueKeys = headers.slice(1).filter((h) => rows.some((r) => typeof r[h] === "number"));

  if (valueKeys.length === 0) return null;

  const pieData = rows.map((r) => ({
    name: String(r[labelKey]),
    value: typeof r[valueKeys[0]] === "number" ? (r[valueKeys[0]] as number) : 0,
  }));

  // Detect if values look like percentages (0–100 range)
  const allVals = rows.flatMap((r) => valueKeys.map((k) => r[k] as number)).filter((v) => !isNaN(v));
  const looksLikePct = allVals.length > 0 && allVals.every((v) => v <= 100);
  const yMin = looksLikePct ? Math.max(0, Math.floor((Math.min(...allVals) - 10) / 10) * 10) : undefined;
  const yTickFmt = (v: number) => looksLikePct ? `${v}%` : v.toLocaleString();

  // Best performers per label row
  const bestPerRow = rows.map((r) => {
    let best = valueKeys[0];
    valueKeys.forEach((k) => {
      if ((r[k] as number) > (r[best] as number)) best = k;
    });
    return { label: String(r[labelKey]), winner: best };
  });

  // Best per series (wins across rows)
  const seriesWins: Record<string, number> = {};
  valueKeys.forEach((k) => { seriesWins[k] = 0; });
  bestPerRow.forEach(({ winner }) => { seriesWins[winner] = (seriesWins[winner] ?? 0) + 1; });
  const topSeries = Object.entries(seriesWins).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const typeButtons: { type: ChartType; icon: React.ReactNode; label: string }[] = [
    { type: "bar",  icon: <BarChart2 className="w-3 h-3" />,  label: "Bar"  },
    { type: "line", icon: <TrendingUp className="w-3 h-3" />, label: "Line" },
    { type: "pie",  icon: <PieIcon className="w-3 h-3" />,    label: "Pie"  },
  ];

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Header — legend left, type-switcher right */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-3 flex-wrap">
          {valueKeys.map((key, i) => (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
              />
              <span className="text-[12px] font-medium text-slate-600">{key}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 shrink-0">
          {typeButtons.map(({ type, icon, label }) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                chartType === type
                  ? "bg-white shadow text-slate-800"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {icon}{label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="px-3 pt-4 pb-2">
        <ResponsiveContainer width="100%" height={260}>
          {chartType === "bar" ? (
            <BarChart data={rows} margin={{ top: 4, right: 16, left: 0, bottom: 32 }} barCategoryGap="30%" barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis
                dataKey={labelKey}
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={rows.length > 4 ? -20 : 0}
                textAnchor={rows.length > 4 ? "end" : "middle"}
                dy={rows.length > 4 ? 6 : 8}
              />
              <YAxis
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                width={40}
                domain={yMin !== undefined ? [yMin, 100] : ["auto", "auto"]}
                tickFormatter={yTickFmt}
              />
              <ReTooltip content={<ChartTooltip />} cursor={{ fill: "#f8fafc" }} />
              {valueKeys.map((key, i) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
              ))}
            </BarChart>
          ) : chartType === "line" ? (
            <LineChart data={rows} margin={{ top: 4, right: 16, left: 0, bottom: 32 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis
                dataKey={labelKey}
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={rows.length > 4 ? -20 : 0}
                textAnchor={rows.length > 4 ? "end" : "middle"}
                dy={rows.length > 4 ? 6 : 8}
              />
              <YAxis
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
                width={40}
                domain={yMin !== undefined ? [yMin, 100] : ["auto", "auto"]}
                tickFormatter={yTickFmt}
              />
              <ReTooltip content={<ChartTooltip />} cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }} />
              {valueKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: CHART_COLORS[i % CHART_COLORS.length], strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                />
              ))}
            </LineChart>
          ) : (
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="48%"
                outerRadius={100}
                innerRadius={44}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
                ))}
              </Pie>
              <ReTooltip content={<ChartTooltip />} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Summary cards — best performer per series */}
      {valueKeys.length > 1 && topSeries.length > 0 && (
        <div className="grid grid-cols-3 gap-2 px-4 pb-4 pt-1">
          {topSeries.map(([key, wins], i) => (
            <div
              key={key}
              className="rounded-xl px-3 py-2.5 border"
              style={{
                background: `${CHART_COLORS[valueKeys.indexOf(key) % CHART_COLORS.length]}10`,
                borderColor: `${CHART_COLORS[valueKeys.indexOf(key) % CHART_COLORS.length]}30`,
              }}
            >
              <p className="text-[10px] text-slate-500 mb-0.5">
                {i === 0 ? "Top performer" : i === 1 ? "Runner-up" : "3rd place"}
              </p>
              <p
                className="text-[13px] font-bold truncate"
                style={{ color: CHART_COLORS[valueKeys.indexOf(key) % CHART_COLORS.length] }}
              >
                {key}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Leads in {wins} of {rows.length}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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

  // Always open on Preview tab when a new artifact loads
  useEffect(() => {
    if (artifact) {
      setActiveTab(artifact.type === "code" ? "preview" : artifact.type);
    }
  }, [artifact?.title, artifact?.type]);

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
                  {artifact.type === "code" ? (
                    <>
                      <TabsTrigger
                        value="preview"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs h-full px-3"
                      >
                        Preview
                      </TabsTrigger>
                      <TabsTrigger
                        value="code"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs h-full px-3"
                      >
                        Code
                      </TabsTrigger>
                    </>
                  ) : (
                    <TabsTrigger
                      value={artifact.type}
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-xs h-full px-3 capitalize"
                    >
                      {artifact.type}
                    </TabsTrigger>
                  )}
                </TabsList>

                {artifact.type === "code" && (
                  <TabsContent value="preview" className="flex-1 overflow-hidden m-0 h-full">
                    <LivePreview
                      code={artifact.content}
                      language={artifact.language ?? "tsx"}
                    />
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

                      <DataChart content={artifact.content} />
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
