import { Artifact } from "./types";

/**
 * Detects whether a completed Claude response contains a notable artifact
 * (code, document, or data table) and returns a structured Artifact object.
 * Returns undefined for plain conversational replies.
 */
export function extractArtifact(content: string): Artifact | undefined {
  // Strip interactive-choice blocks so they are never treated as code artifacts
  const stripped = content.replace(/```options\s*\n[\s\S]+?```/g, "");

  // ── 1. Code block ────────────────────────────────────────────────────────
  // Match the *largest* fenced code block present
  const codeRegex = /```(\w[\w-]*)\n([\s\S]+?)```/g;
  let bestCode: { lang: string; body: string } | null = null;

  let match: RegExpExecArray | null;
  while ((match = codeRegex.exec(stripped)) !== null) {
    const [, lang, body] = match;
    if (!bestCode || body.length > bestCode.body.length) {
      bestCode = { lang: lang.toLowerCase(), body: body.trimEnd() };
    }
  }

  if (bestCode && bestCode.body.split("\n").length >= 4) {
    const title = guessCodeTitle(bestCode.lang, stripped);
    return {
      type: "code",
      title,
      language: bestCode.lang,
      content: bestCode.body,
    };
  }

  // ── 2. Data table ─────────────────────────────────────────────────────────
  const tableLines = stripped
    .split("\n")
    .filter((l) => l.trim().startsWith("|") && l.trim().endsWith("|"));

  if (tableLines.length >= 3) {
    const tableStart = stripped.indexOf(tableLines[0]);
    const tableBlock = stripped.slice(tableStart);
    const title = guessDocTitle(stripped) || "Data Table";
    return {
      type: "data",
      title,
      content: tableBlock.trim(),
    };
  }

  // ── 3. Structured document ────────────────────────────────────────────────
  const h2Count = (stripped.match(/^##\s+/gm) || []).length;
  const wordCount = stripped.split(/\s+/).length;

  if (h2Count >= 2 && wordCount >= 120) {
    const title = guessDocTitle(stripped) || "Document";
    return {
      type: "document",
      title,
      content: stripped.trim(),
    };
  }

  // Plain response — no artifact
  return undefined;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function guessCodeTitle(lang: string, surrounding: string): string {
  // Look for a sentence right before the code block
  const beforeBlock = surrounding.split("```")[0];
  const lastLine = beforeBlock
    .split("\n")
    .filter((l) => l.trim())
    .pop()
    ?.replace(/[:#]+$/, "")
    .trim();

  if (lastLine && lastLine.length < 80 && lastLine.length > 4) return lastLine;

  const langLabels: Record<string, string> = {
    tsx: "React Component",
    jsx: "React Component",
    ts: "TypeScript",
    typescript: "TypeScript",
    js: "JavaScript",
    javascript: "JavaScript",
    py: "Python Script",
    python: "Python Script",
    sql: "SQL Query",
    bash: "Shell Script",
    sh: "Shell Script",
    css: "Stylesheet",
    html: "HTML",
    json: "JSON",
    yaml: "YAML",
    yml: "YAML",
    rust: "Rust",
    go: "Go",
    java: "Java",
    cpp: "C++",
    c: "C",
  };
  return langLabels[lang] ?? lang.toUpperCase();
}

function guessDocTitle(content: string): string {
  // Try # Heading first
  const h1 = content.match(/^#\s+(.+)/m);
  if (h1) return h1[1].trim();
  // First ## heading
  const h2 = content.match(/^##\s+(.+)/m);
  if (h2) return h2[1].trim();
  return "";
}
