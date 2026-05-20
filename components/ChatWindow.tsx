"use client";

import { useEffect, useRef, useCallback } from "react";
import { Message, Artifact } from "@/lib/types";
import { ChatMessage } from "./ChatMessage";
import { SuggestedPrompts } from "./SuggestedPrompts";

interface ChatWindowProps {
  messages: Message[];
  isDark: boolean;
  onOpenArtifact: (artifact: Artifact) => void;
  onSuggestedPrompt: (prompt: string) => void;
  onRegenerate: () => void;
  onOptionSelect: (choice: string) => void;
}

export function ChatWindow({
  messages,
  isDark,
  onOpenArtifact,
  onSuggestedPrompt,
  onRegenerate,
  onOptionSelect,
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);
  const prevIsStreaming = useRef(false);
  const isStreaming = messages.some((m) => m.isStreaming);

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  // When user scrolls manually, record whether they're away from bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      userScrolledUp.current = !isNearBottom();
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isNearBottom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Streaming just started (new turn) — reset user-scroll flag and snap to bottom
    if (isStreaming && !prevIsStreaming.current) {
      userScrolledUp.current = false;
    }

    if (isStreaming && !userScrolledUp.current) {
      // Instant scroll during streaming so it never fights user drag
      el.scrollTop = el.scrollHeight;
    } else if (!isStreaming && prevIsStreaming.current) {
      // Streaming just finished — smooth scroll once to reveal full response
      userScrolledUp.current = false;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    prevIsStreaming.current = isStreaming;
  }, [messages, isStreaming]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
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
                onOptionSelect={onOptionSelect}
                onRegenerate={i === messages.length - 1 ? onRegenerate : undefined}
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
