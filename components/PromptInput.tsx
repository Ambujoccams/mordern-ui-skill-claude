"use client";

import { useRef, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Send, Mic, StopCircle, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ModelSelector } from "./ModelSelector";
import { ToolSelector } from "./ToolSelector";
import { FileUploadButton } from "./FileUploadButton";
import { Model } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PromptInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  selectedModel: Model;
  onModelSelect: (m: Model) => void;
  enabledTools: Set<string>;
  onToolToggle: (id: string) => void;
  onFileSelect?: (file: File) => void;
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  selectedModel,
  onModelSelect,
  enabledTools,
  onToolToggle,
  onFileSelect,
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && value.trim()) onSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  const canSend = !!value.trim() && !isLoading;

  return (
    <div className="px-4 pb-5 pt-2">
      <motion.div
        initial={{ y: 6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={cn(
          "rounded-2xl border bg-white shadow-sm transition-all duration-150",
          "focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_oklch(0.61_0.125_38_/_12%)]",
          "border-border"
        )}
      >
        {/* Textarea */}
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKey}
          placeholder="Message Claude…"
          className={cn(
            "min-h-[56px] max-h-[200px] resize-none border-0 bg-transparent shadow-none",
            "focus-visible:ring-0 text-[14.5px] leading-relaxed",
            "px-4 pt-3.5 pb-2 placeholder:text-muted-foreground/50"
          )}
          rows={1}
          disabled={isLoading}
        />

        {/* Bottom toolbar */}
        <div className="flex items-center gap-1.5 px-3 pb-3 pt-1">
          {/* Attachment + voice */}
          <FileUploadButton onFileSelect={onFileSelect} />
          <Tooltip>
            <TooltipTrigger render={<button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" />}>
              <Mic className="w-4 h-4" />
            </TooltipTrigger>
            <TooltipContent side="top">Voice input</TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-4 mx-0.5 bg-border" />

          {/* Model + Tools */}
          <ModelSelector selectedModel={selectedModel} onSelect={onModelSelect} />
          <ToolSelector enabledTools={enabledTools} onToggle={onToolToggle} />

          <div className="flex-1" />

          {/* Send button — Claude-style orange circle */}
          <button
            disabled={!canSend}
            onClick={onSubmit}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
              canSend
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-95"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <StopCircle className="w-4 h-4" />
            ) : (
              <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </motion.div>

      <p className="text-center text-[11px] text-muted-foreground/60 mt-2">
        Claude can make mistakes. Please double-check responses.
      </p>
    </div>
  );
}
