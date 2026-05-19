"use client";

import { ChevronDown, Cpu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Model } from "@/lib/types";
import { MODELS } from "@/lib/demo-data";

interface ModelSelectorProps {
  selectedModel: Model;
  onSelect: (model: Model) => void;
}

const providerColors: Record<string, string> = {
  Anthropic: "bg-orange-500/10 text-orange-600",
  OpenAI: "bg-green-500/10 text-green-600",
  Google: "bg-blue-500/10 text-blue-600",
};

export function ModelSelector({ selectedModel, onSelect }: ModelSelectorProps) {
  const grouped = MODELS.reduce<Record<string, Model[]>>((acc, m) => {
    (acc[m.provider] = acc[m.provider] || []).push(m);
    return acc;
  }, {});

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs font-medium rounded-lg border-border bg-transparent hover:bg-muted" />}>
        <Cpu className="w-3.5 h-3.5" />
        {selectedModel.name}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {Object.entries(grouped).map(([provider, models]) => (
          <div key={provider}>
            <DropdownMenuLabel className="text-xs text-muted-foreground">{provider}</DropdownMenuLabel>
            {models.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onClick={() => onSelect(model)}
                className="flex flex-col items-start gap-0.5 cursor-pointer"
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="font-medium text-sm">{model.name}</span>
                  {model.id === selectedModel.id && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-auto">
                      Active
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{model.description}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
