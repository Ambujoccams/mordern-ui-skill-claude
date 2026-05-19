export type Role = "user" | "assistant" | "system";

export type WorkspaceTab = "preview" | "code" | "document" | "data";

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  artifact?: Artifact;
}

export interface Artifact {
  type: "code" | "document" | "data" | "preview";
  title: string;
  language?: string;
  content: string;
}

export interface Chat {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
  messages: Message[];
}

export interface Project {
  id: string;
  name: string;
  chats: Chat[];
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  description: string;
}

export interface Tool {
  id: string;
  name: string;
  icon: string;
  description: string;
}
