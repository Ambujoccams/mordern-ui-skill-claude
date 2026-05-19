"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PanelLeft, PanelRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/Sidebar";
import { ChatWindow } from "@/components/ChatWindow";
import { PromptInput } from "@/components/PromptInput";
import { WorkspacePanel } from "@/components/WorkspacePanel";
import { Message, Artifact, Model, Chat } from "@/lib/types";
import { MODELS } from "@/lib/demo-data";
import { extractArtifact } from "@/lib/artifacts";

// ── ID helpers ────────────────────────────────────────────────────────────
let _counter = 0;
const uid = (prefix = "m") => `${prefix}_${Date.now()}_${++_counter}`;

// ── Chat-title heuristic ──────────────────────────────────────────────────
function makeTitle(content: string): string {
  const clean = content.replace(/[#*`>\-]/g, "").trim();
  return clean.length > 48 ? clean.slice(0, 48) + "…" : clean;
}

// ── SSE stream consumer ───────────────────────────────────────────────────
async function* readStream(
  response: Response
): AsyncGenerator<{ type: string; text?: string; message?: string }> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          yield JSON.parse(line.slice(6));
        } catch {
          // skip malformed line
        }
      }
    }
  }
}

export default function Home() {
  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceWidth, setWorkspaceWidth] = useState(460);
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);

  // Real chat history (in-memory; replace with DB/localStorage for persistence)
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>(messages);
  messagesRef.current = messages;

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model>(MODELS[1]); // Sonnet 4
  const [enabledTools, setEnabledTools] = useState<Set<string>>(new Set());

  // Sync dark mode class
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  // ── Chat management ───────────────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    setActiveChatId(null);
    setMessages([]);
    setWorkspaceOpen(false);
    setActiveArtifact(null);
  }, []);

  const handleChatSelect = useCallback(
    (id: string) => {
      const chat = chats.find((c) => c.id === id);
      if (!chat) return;
      setActiveChatId(id);
      setMessages(chat.messages);
      setWorkspaceOpen(false);
      setActiveArtifact(null);
    },
    [chats]
  );

  const handleOpenArtifact = useCallback((artifact: Artifact) => {
    setActiveArtifact(artifact);
    setWorkspaceOpen(true);
  }, []);

  const handleToolToggle = useCallback((id: string) => {
    setEnabledTools((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ── Core send / stream logic ──────────────────────────────────────────────
  const doSubmit = useCallback(
    async (promptText: string) => {
      const trimmed = promptText.trim();
      if (!trimmed || isLoading) return;

      const isFirstMessage = messagesRef.current.length === 0;
      const chatId = activeChatId ?? uid("c");

      const userMsg: Message = {
        id: uid(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };
      const thinkingMsg: Message = {
        id: uid("thinking"),
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };

      const nextMessages = [...messagesRef.current, userMsg, thinkingMsg];
      setMessages(nextMessages);
      setInput("");
      setIsLoading(true);

      // Create or update chat entry in sidebar immediately
      if (isFirstMessage) {
        setActiveChatId(chatId);
        const newChat: Chat = {
          id: chatId,
          title: makeTitle(trimmed),
          preview: trimmed,
          timestamp: new Date(),
          messages: nextMessages,
        };
        setChats((prev) => [newChat, ...prev]);
      }

      // Accumulate streamed text
      let accText = "";

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: selectedModel.id,
            messages: nextMessages
              .filter((m) => !m.isStreaming)
              .map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`API error ${res.status}`);
        }

        // Stream into the thinking placeholder
        for await (const event of readStream(res)) {
          if (event.type === "delta" && event.text) {
            accText += event.text;
            setMessages((prev) =>
              prev.map((m) =>
                m.isStreaming ? { ...m, content: accText } : m
              )
            );
          } else if (event.type === "error") {
            throw new Error(event.message ?? "Stream error");
          }
        }
      } catch (err) {
        const errText =
          err instanceof Error ? err.message : "Something went wrong";
        accText = `⚠️ **Error:** ${errText}\n\nPlease check that \`ANTHROPIC_API_KEY\` is set in \`.env.local\` and restart the dev server.`;
      }

      // Finalise the assistant message
      const artifact = extractArtifact(accText);
      const assistantMsg: Message = {
        id: uid(),
        role: "assistant",
        content: accText,
        timestamp: new Date(),
        artifact,
      };

      const finalMessages = [
        ...messagesRef.current.filter((m) => !m.isStreaming),
        assistantMsg,
      ];

      setMessages(finalMessages);
      setIsLoading(false);

      // Update chat in sidebar
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                messages: finalMessages,
                preview: trimmed,
                timestamp: new Date(),
              }
            : c
        )
      );

      // Auto-open workspace if artifact found
      if (artifact) {
        setActiveArtifact(artifact);
        setWorkspaceOpen(true);
      }
    },
    [isLoading, activeChatId, selectedModel]
  );

  const handleSubmit = useCallback(() => doSubmit(input), [input, doSubmit]);

  const handleSuggestedPrompt = useCallback(
    (p: string) => doSubmit(p),
    [doSubmit]
  );

  // Called when user clicks a choice inside an InteractiveChoiceCard
  const handleOptionSelect = useCallback(
    (choice: string) => doSubmit(choice),
    [doSubmit]
  );

  const handleRegenerate = useCallback(async () => {
    if (isLoading) return;
    const lastUser = [...messagesRef.current]
      .reverse()
      .find((m) => m.role === "user");
    if (!lastUser) return;

    // Strip last assistant turn and re-submit
    const withoutLastAssistant = messagesRef.current.filter(
      (m, i, arr) => !(m.role === "assistant" && i === arr.length - 1)
    );
    setMessages(withoutLastAssistant);
    await doSubmit(lastUser.content);
  }, [isLoading, doSubmit]);

  const activeChat = chats.find((c) => c.id === activeChatId);
  const chatTitle = activeChat?.title ?? "New conversation";

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar receives live chat list */}
      <Sidebar
        isOpen={sidebarOpen}
        isDark={isDark}
        chats={chats}
        activeChatId={activeChatId ?? ""}
        onChatSelect={handleChatSelect}
        onNewChat={handleNewChat}
        onToggleDark={() => setIsDark(!isDark)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0 bg-background/80 backdrop-blur-sm">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                />
              }
            >
              <PanelLeft className="w-4 h-4" />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            </TooltipContent>
          </Tooltip>

          <h1 className="text-[13px] font-medium flex-1 truncate text-center text-foreground/70">
            {chatTitle}
          </h1>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setWorkspaceOpen(!workspaceOpen)}
                />
              }
            >
              <PanelRight className="w-4 h-4" />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {workspaceOpen ? "Hide workspace" : "Show workspace"}
            </TooltipContent>
          </Tooltip>
        </header>

        {/* Chat + Workspace */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <ChatWindow
              messages={messages}
              isDark={isDark}
              onOpenArtifact={handleOpenArtifact}
              onSuggestedPrompt={handleSuggestedPrompt}
              onRegenerate={handleRegenerate}
              onOptionSelect={handleOptionSelect}
            />
            <PromptInput
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              selectedModel={selectedModel}
              onModelSelect={setSelectedModel}
              enabledTools={enabledTools}
              onToolToggle={handleToolToggle}
            />
          </div>

          <WorkspacePanel
            artifact={activeArtifact}
            isOpen={workspaceOpen}
            isDark={isDark}
            onClose={() => setWorkspaceOpen(false)}
            width={workspaceWidth}
            onWidthChange={setWorkspaceWidth}
          />
        </div>
      </div>
    </div>
  );
}
