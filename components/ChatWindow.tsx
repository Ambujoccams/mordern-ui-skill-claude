"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";
import { SuggestedPrompts } from "./SuggestedPrompts";
import { Message, Artifact } from "@/lib/types";

interface ChatWindowProps {
  messages: Message[];
  isDark: boolean;
  onOpenArtifact: (artifact: Artifact) => void;
  onSuggestedPrompt: (prompt: string) => void;
  onRegenerate: () => void;
}

export function ChatWindow({
  messages,
  isDark,
  onOpenArtifact,
  onSuggestedPrompt,
  onRegenerate,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <ScrollArea className="flex-1 overflow-y-auto">
      <div className="min-h-full flex flex-col">
        {messages.length === 0 ? (
          <SuggestedPrompts onSelect={onSuggestedPrompt} />
        ) : (
          <div className="flex flex-col py-2 max-w-4xl mx-auto w-full">
            {messages.map((msg, i) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isDark={isDark}
                onOpenArtifact={onOpenArtifact}
                onRegenerate={i === messages.length - 1 ? onRegenerate : undefined}
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
