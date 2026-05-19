"use client";

import { useState } from "react";
import { Wrench, Globe, Terminal, FileText, Image, BarChart2, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tool } from "@/lib/types";
import { TOOLS } from "@/lib/demo-data";

const iconMap: Record<string, React.ElementType> = {
  Globe,
  Terminal,
  FileText,
  Image,
  BarChart2,
};

interface ToolSelectorProps {
  enabledTools: Set<string>;
  onToggle: (toolId: string) => void;
}

export function ToolSelector({ enabledTools, onToggle }: ToolSelectorProps) {
  const count = enabledTools.size;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs relative rounded-lg border-border bg-transparent hover:bg-muted" />}>
        <Wrench className="w-3.5 h-3.5" />
        Tools
        {count > 0 && (
          <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[10px] absolute -top-1.5 -right-1.5">
            {count}
          </Badge>
        )}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Available Tools</DropdownMenuLabel>
        {TOOLS.map((tool) => {
          const Icon = iconMap[tool.icon] || Wrench;
          const enabled = enabledTools.has(tool.id);
          return (
            <DropdownMenuItem
              key={tool.id}
              onClick={() => onToggle(tool.id)}
              className="flex items-start gap-2 cursor-pointer"
            >
              <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5 ${enabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{tool.name}</p>
                <p className="text-xs text-muted-foreground truncate">{tool.description}</p>
              </div>
              {enabled && <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-1" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
