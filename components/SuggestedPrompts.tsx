"use client";

import { motion } from "framer-motion";
import { SUGGESTED_PROMPTS } from "@/lib/demo-data";

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
}

export function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-12 px-6">
      {/* Claude-style greeting */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8 text-center"
      >
        {/* Logo mark */}
        <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto mb-5">
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-primary">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
          </svg>
        </div>
        <h1 className="text-[28px] font-semibold text-foreground tracking-tight">
          Good morning, Ambuj
        </h1>
        <p className="text-[15px] text-muted-foreground mt-1.5">
          How can I help you today?
        </p>
      </motion.div>

      {/* Prompt chips */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-2xl"
      >
        {SUGGESTED_PROMPTS.map((prompt, i) => (
          <motion.button
            key={prompt}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 + i * 0.04 }}
            onClick={() => onSelect(prompt)}
            className="text-left px-4 py-3.5 rounded-xl bg-white border border-border hover:border-primary/40 hover:shadow-sm transition-all text-[13.5px] text-foreground/80 hover:text-foreground group"
          >
            <span className="line-clamp-1">{prompt}</span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
