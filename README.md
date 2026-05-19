# mordern-ui-skill-claude

A modern interactive AI chatbot UI inspired by ChatGPT Canvas and Claude Artifacts — built with Next.js, real Claude API streaming, and a warm Claude-inspired light theme.

---

## Codex Prompt

> Paste this into [Codex](https://chatgpt.com/codex) to reproduce this project from scratch:

```text
Build a modern interactive AI chatbot UI inspired by ChatGPT Canvas and Claude Artifacts.

Goal:
Create a full-screen chatbot web app with three main areas:
1. Left sidebar for chat history and projects
2. Center chat area for conversation
3. Right workspace/canvas panel for generated outputs, previews, documents, code, charts, or interactive cards

Tech stack:
- Next.js
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- shadcn/ui components
- Lucide icons

UI requirements:
- Clean modern SaaS design
- Dark/light mode support
- Responsive layout for desktop and mobile
- Collapsible sidebar
- Resizable right workspace panel
- Sticky bottom prompt input
- Streaming AI response animation
- Markdown rendering
- Syntax-highlighted code blocks
- Copy, retry, edit, and regenerate buttons on messages
- File upload button
- Voice input button placeholder
- Tool selector dropdown
- Model selector dropdown
- Suggested prompt chips
- Loading/thinking state

Main layout:
- Sidebar: previous chats, new chat button, project sections
- Chat area: user and assistant messages, timestamps, actions
- Workspace panel: tabs for Preview, Code, Document, Data
- Input area: multiline textarea, send button, upload button, tools button

Behavior:
- When user sends a prompt, add it to chat
- Show assistant streaming placeholder
- Generate mock AI response
- If response includes code/document/table, show it in the workspace panel
- Allow workspace panel to be hidden or expanded
- Keep the design close to modern AI tools like ChatGPT and Claude, but do not copy their branding

Create reusable components:
- Sidebar
- ChatMessage
- ChatWindow
- PromptInput
- WorkspacePanel
- ToolSelector
- ModelSelector
- SuggestedPrompts
- CodeBlock
- FileUploadButton

Design style:
- Rounded corners
- Soft shadows
- Subtle borders
- Smooth animations
- Minimal icons
- Good spacing
- Professional AI productivity app feel

Add demo data so the UI looks complete immediately.
```

### Reference Links

| Resource | URL |
|----------|-----|
| ChatGPT Canvas | https://openai.com/index/introducing-canvas/ |
| Claude Artifacts | https://www.anthropic.com/news/artifacts |
| Claude Computer Use | https://www.anthropic.com/news/3-5-models-and-computer-use |
| shadcn/ui | https://ui.shadcn.com/ |
| Tailwind CSS | https://tailwindcss.com/ |
| Framer Motion | https://motion.dev/ |
| Lucide Icons | https://lucide.dev/ |

---

## Tech Stack

- **Framework** — [Next.js 16](https://nextjs.org) (App Router)
- **Language** — TypeScript
- **Styling** — Tailwind CSS v4 + Claude-inspired warm light theme
- **Components** — [shadcn/ui](https://ui.shadcn.com/) (base-ui)
- **Animation** — [Framer Motion](https://motion.dev/)
- **Icons** — [Lucide React](https://lucide.dev/)
- **AI** — [Anthropic SDK](https://docs.anthropic.com/) — real streaming responses
- **Markdown** — react-markdown + remark-gfm
- **Syntax Highlight** — react-syntax-highlighter

---

## Features

- **3-panel layout** — collapsible sidebar · scrollable chat · resizable workspace
- **Streaming responses** — token-by-token rendering via SSE from `/api/chat`
- **Artifact detection** — auto-extracts code blocks, markdown tables, and structured documents into the workspace panel
- **Model selector** — Claude Opus 4 · Sonnet 4 · Haiku 4
- **Tool toggles** — Web Search, Code Execution, File Analysis, Image Gen, Data Analysis
- **Markdown rendering** — headers, lists, tables, blockquotes, inline code
- **Syntax-highlighted code blocks** — with copy button and language label
- **Message actions** — copy · thumbs up/down · regenerate · edit
- **Chat history** — real in-state chat list grouped by Today / Yesterday / Older
- **Claude-inspired theme** — warm cream background, Anthropic orange primary

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/Ambujoccams/mordern-ui-skill-claude.git
cd mordern-ui-skill-claude/chatbot-ui
npm install
```

### 2. Add your Anthropic API key

```bash
cp .env.local.example .env.local
# then open .env.local and replace the placeholder:
# ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxx
```

Get your key at [console.anthropic.com](https://console.anthropic.com/).

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
chatbot-ui/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts        # Streaming Claude API endpoint (SSE)
│   ├── globals.css             # Claude-inspired warm light theme (oklch)
│   ├── layout.tsx
│   └── page.tsx                # Main app — chat state & streaming logic
├── components/
│   ├── Sidebar.tsx             # Collapsible sidebar with real chat history
│   ├── ChatWindow.tsx          # Scrollable message list
│   ├── ChatMessage.tsx         # User bubble + Claude flat message + artifact card
│   ├── CodeBlock.tsx           # Syntax-highlighted code with copy button
│   ├── PromptInput.tsx         # Multiline textarea + toolbar
│   ├── WorkspacePanel.tsx      # Resizable right panel with tabs
│   ├── ModelSelector.tsx       # Claude model dropdown
│   ├── ToolSelector.tsx        # Tool toggle dropdown
│   ├── SuggestedPrompts.tsx    # Empty-state prompt chips
│   └── FileUploadButton.tsx    # File attachment input
├── lib/
│   ├── artifacts.ts            # Parses Claude responses into artifacts
│   ├── demo-data.ts            # Models, tools, suggested prompts config
│   ├── types.ts                # Shared TypeScript types
│   └── utils.ts                # cn() helper
├── .env.local.example
└── package.json
```

---

## API Route

`POST /api/chat`

**Request body:**
```json
{
  "messages": [
    { "role": "user", "content": "Build a React dashboard" }
  ],
  "model": "sonnet-4"
}
```

**Response:** `text/event-stream` (SSE)

```
data: {"type":"delta","text":"Here"}
data: {"type":"delta","text":" is"}
data: {"type":"done","inputTokens":12,"outputTokens":340}
```

**Model IDs:**

| Selector value | Anthropic model |
|----------------|----------------|
| `opus-4` | `claude-opus-4-7` |
| `sonnet-4` | `claude-sonnet-4-6` |
| `haiku-4` | `claude-haiku-4-5-20251001` |

---

## Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Ambujoccams/mordern-ui-skill-claude)

Add `ANTHROPIC_API_KEY` in your Vercel project environment variables before deploying.
