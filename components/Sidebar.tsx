"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Plus,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Search,
  Settings,
  Moon,
  Sun,
  Trash2,
  PenSquare,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Chat } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  isDark: boolean;
  chats: Chat[];
  activeChatId: string;
  onChatSelect: (id: string) => void;
  onNewChat: () => void;
  onToggleDark: () => void;
}

function timeAgo(date: Date) {
  const diff = Date.now() - date.getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Group chats into Today / Yesterday / Older
function groupChats(chats: Chat[]) {
  const now = Date.now();
  const DAY = 86_400_000;
  const today: Chat[] = [];
  const yesterday: Chat[] = [];
  const older: Chat[] = [];

  for (const c of chats) {
    const age = now - c.timestamp.getTime();
    if (age < DAY) today.push(c);
    else if (age < 2 * DAY) yesterday.push(c);
    else older.push(c);
  }
  return { today, yesterday, older };
}

export function Sidebar({
  isOpen,
  isDark,
  chats,
  activeChatId,
  onChatSelect,
  onNewChat,
  onToggleDark,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredChat, setHoveredChat] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const visibleChats = chats.filter(
    (c) =>
      !deletedIds.has(c.id) &&
      (searchQuery === "" ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const { today, yesterday, older } = groupChats(visibleChats);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletedIds((prev) => new Set([...prev, id]));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 260, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="flex flex-col h-full border-r border-sidebar-border bg-sidebar overflow-hidden shrink-0"
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              {/* Claude-style logo */}
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-primary-foreground">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
                </svg>
              </div>
              <span className="font-semibold text-[15px] text-foreground tracking-tight">
                Claude
              </span>
            </div>
            <button
              onClick={onNewChat}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            >
              <PenSquare className="w-4 h-4" />
            </button>
          </div>

          {/* ── New Chat CTA ── */}
          <div className="px-3 pb-2">
            <button
              onClick={onNewChat}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New conversation
            </button>
          </div>

          {/* ── Search ── */}
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/60 border border-sidebar-border">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Search conversations…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/60 text-foreground"
              />
            </div>
          </div>

          <Separator className="bg-sidebar-border mx-3 mb-1 w-auto" />

          {/* ── Chat list ── */}
          <ScrollArea className="flex-1 px-2">
            {visibleChats.length === 0 && (
              <div className="px-3 py-8 text-center">
                <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  {searchQuery ? "No matches found" : "No conversations yet"}
                </p>
              </div>
            )}

            {today.length > 0 && (
              <ChatGroup label="Today" chats={today} activeChatId={activeChatId} hoveredId={hoveredChat} onSelect={onChatSelect} onHover={setHoveredChat} onDelete={handleDelete} />
            )}
            {yesterday.length > 0 && (
              <ChatGroup label="Yesterday" chats={yesterday} activeChatId={activeChatId} hoveredId={hoveredChat} onSelect={onChatSelect} onHover={setHoveredChat} onDelete={handleDelete} />
            )}
            {older.length > 0 && (
              <ChatGroup label="Older" chats={older} activeChatId={activeChatId} hoveredId={hoveredChat} onSelect={onChatSelect} onHover={setHoveredChat} onDelete={handleDelete} />
            )}
          </ScrollArea>

          {/* ── Footer ── */}
          <div className="p-2 border-t border-sidebar-border space-y-0.5">
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
              onClick={onToggleDark}
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span className="text-xs">{isDark ? "Light mode" : "Dark mode"}</span>
            </button>
            <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors">
              <Settings className="w-3.5 h-3.5" />
              <span className="text-xs">Settings</span>
            </button>

            {/* Profile */}
            <div className="flex items-center gap-2.5 px-2 py-2 mt-1 rounded-lg hover:bg-sidebar-accent cursor-pointer transition-colors">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-[11px] text-primary-foreground font-semibold shrink-0">
                AS
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">Ambuj Singh</p>
                <p className="text-[10px] text-muted-foreground truncate">Pro Plan</p>
              </div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

// ── Chat group (Today / Yesterday / Older) ────────────────────────────────

function ChatGroup({
  label,
  chats,
  activeChatId,
  hoveredId,
  onSelect,
  onHover,
  onDelete,
}: {
  label: string;
  chats: Chat[];
  activeChatId: string;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}) {
  return (
    <div className="py-2">
      <p className="text-[10px] font-semibold text-muted-foreground/60 px-2 mb-1.5 uppercase tracking-widest">
        {label}
      </p>
      {chats.map((chat) => (
        <ChatItem
          key={chat.id}
          chat={chat}
          isActive={activeChatId === chat.id}
          isHovered={hoveredId === chat.id}
          onSelect={() => onSelect(chat.id)}
          onHover={(h) => onHover(h ? chat.id : null)}
          onDelete={(e) => onDelete(e, chat.id)}
        />
      ))}
    </div>
  );
}

// ── Single chat row ───────────────────────────────────────────────────────

function ChatItem({
  chat,
  isActive,
  isHovered,
  onSelect,
  onHover,
  onDelete,
}: {
  chat: Chat;
  isActive: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (h: boolean) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={cn(
        "group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors",
        isActive
          ? "bg-white shadow-sm border border-sidebar-border/60 text-foreground"
          : "text-foreground/75 hover:bg-sidebar-accent hover:text-foreground"
      )}
    >
      <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-50 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-medium truncate">{chat.title}</p>
        <p className="text-[10px] text-muted-foreground">{timeAgo(chat.timestamp)}</p>
      </div>
      {isHovered && (
        <button
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted/60 transition-all"
          onClick={onDelete}
        >
          <Trash2 className="w-3 h-3 text-muted-foreground hover:text-red-500 transition-colors" />
        </button>
      )}
    </div>
  );
}
