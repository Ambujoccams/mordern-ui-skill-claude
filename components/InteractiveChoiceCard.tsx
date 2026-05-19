"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CornerDownLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface InteractiveChoiceCardProps {
  question: string;
  choices: string[];
  onSelect: (choice: string) => void;
}

export function InteractiveChoiceCard({
  question,
  choices,
  onSelect,
}: InteractiveChoiceCardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [customText, setCustomText] = useState("");

  if (dismissed) return null;

  const handleSelect = (choice: string) => {
    if (selected) return;
    setSelected(choice);
    setTimeout(() => {
      onSelect(choice);
      setDismissed(true);
    }, 320);
  };

  const handleCustomSubmit = () => {
    const text = customText.trim();
    if (!text || selected) return;
    handleSelect(text);
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="mt-3 rounded-2xl border border-border bg-white shadow-md overflow-hidden w-full max-w-md"
        >
          {/* Header */}
          <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-border/60">
            <p className="text-[13.5px] font-semibold text-foreground leading-snug pr-4">
              {question}
            </p>
            <button
              onClick={() => setDismissed(true)}
              className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Choices */}
          <div className="py-1">
            {choices.map((choice, i) => {
              const isSelected = selected === choice;
              const isOther = selected && !isSelected;
              return (
                <button
                  key={choice}
                  onClick={() => handleSelect(choice)}
                  disabled={!!selected}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all",
                    "disabled:cursor-default",
                    isSelected
                      ? "bg-primary/8 text-primary"
                      : isOther
                      ? "opacity-40"
                      : "hover:bg-muted/60 text-foreground/85 hover:text-foreground"
                  )}
                >
                  {/* Number badge */}
                  <span
                    className={cn(
                      "w-5 h-5 rounded-md text-[11px] font-semibold flex items-center justify-center shrink-0 transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isSelected ? <Check className="w-3 h-3" /> : i + 1}
                  </span>
                  <span className="text-[13px] flex-1">{choice}</span>
                  {!selected && (
                    <CornerDownLeft className="w-3.5 h-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Free-text fallback */}
          {!selected && (
            <div className="px-3 pb-3 pt-1 border-t border-border/60">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/50 focus-within:border-primary/40 focus-within:bg-white transition-all">
                <span className="text-muted-foreground shrink-0">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 4h12M2 8h8M2 12h10" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
                  placeholder="Or type your own answer…"
                  className="flex-1 text-[12.5px] bg-transparent outline-none placeholder:text-muted-foreground/50 text-foreground"
                />
                {customText.trim() && (
                  <button
                    onClick={handleCustomSubmit}
                    className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Send
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Parser helper ─────────────────────────────────────────────────────────

export interface ChoiceCard {
  question: string;
  choices: string[];
}

/** Extract the first ```options block from a response string. */
export function parseChoiceCard(content: string): ChoiceCard | null {
  const match = content.match(/```options\s*\n([\s\S]+?)```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1].trim());
    if (
      typeof parsed.question === "string" &&
      Array.isArray(parsed.choices) &&
      parsed.choices.length >= 2
    ) {
      return {
        question: parsed.question,
        choices: parsed.choices.map(String),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** Strip ```options blocks from content so they don't appear as raw text. */
export function stripChoiceBlocks(content: string): string {
  return content.replace(/```options\s*\n[\s\S]+?```/g, "").trim();
}
