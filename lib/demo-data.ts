import { Model, Tool } from "./types";

// ── Available Claude models ───────────────────────────────────────────────
export const MODELS: Model[] = [
  {
    id: "opus-4",
    name: "Claude Opus 4",
    provider: "Anthropic",
    description: "Most intelligent — complex reasoning & long tasks",
  },
  {
    id: "sonnet-4",
    name: "Claude Sonnet 4",
    provider: "Anthropic",
    description: "Best balance of intelligence and speed",
  },
  {
    id: "haiku-4",
    name: "Claude Haiku 4",
    provider: "Anthropic",
    description: "Fastest — great for simple tasks",
  },
];

// ── Pluggable tools (UI only — server-side wiring left as extension) ──────
export const TOOLS: Tool[] = [
  {
    id: "web",
    name: "Web Search",
    icon: "Globe",
    description: "Search the web for up-to-date information",
  },
  {
    id: "code",
    name: "Code Execution",
    icon: "Terminal",
    description: "Run code in a sandbox environment",
  },
  {
    id: "files",
    name: "File Analysis",
    icon: "FileText",
    description: "Analyse uploaded files and documents",
  },
  {
    id: "image",
    name: "Image Generation",
    icon: "Image",
    description: "Generate images from text prompts",
  },
  {
    id: "data",
    name: "Data Analysis",
    icon: "BarChart2",
    description: "Analyse and visualise data",
  },
];

// ── Suggested starter prompts ─────────────────────────────────────────────
export const SUGGESTED_PROMPTS = [
  "Build a React authentication form with validation and error states",
  "Explain how async/await works with practical examples",
  "Write a Python script to parse and summarise a CSV file",
  "Create a responsive navbar component with Tailwind CSS",
  "Design a REST API schema for a todo app with users",
  "What are the key differences between SQL and NoSQL databases?",
];
