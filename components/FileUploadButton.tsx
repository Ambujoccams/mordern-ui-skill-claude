"use client";

import { useRef } from "react";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface FileUploadButtonProps {
  onFileSelect?: (file: File) => void;
}

export function FileUploadButton({ onFileSelect }: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelect) onFileSelect(file);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf,.txt,.csv,.json,.ts,.tsx,.js,.jsx,.py,.md"
        onChange={handleChange}
      />
      <Tooltip>
        <TooltipTrigger render={<button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" onClick={() => inputRef.current?.click()} />}>
          <Paperclip className="w-4 h-4" />
        </TooltipTrigger>
        <TooltipContent side="top">Attach file</TooltipContent>
      </Tooltip>
    </>
  );
}
