"use client";

import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Check, Copy, ChevronDown } from "lucide-react";
import { useState, useCallback } from "react";

const LANGUAGES = [
  { value: "plaintext", label: "Plain Text" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "csharp", label: "C#" },
  { value: "sql", label: "SQL" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "bash", label: "Bash" },
  { value: "shell", label: "Shell" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "markdown", label: "Markdown" },
  { value: "xml", label: "XML" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "graphql", label: "GraphQL" },
  { value: "r", label: "R" },
  { value: "lua", label: "Lua" },
  { value: "perl", label: "Perl" },
  { value: "scala", label: "Scala" },
  { value: "haskell", label: "Haskell" },
] as const;

export function CodeBlockHighlight({ node, updateAttributes }: NodeViewProps) {
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const language = (node.attrs.language as string) || "plaintext";
  const currentLabel =
    LANGUAGES.find((l) => l.value === language)?.label || language;

  const handleCopy = useCallback(async () => {
    const text = node.textContent;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [node]);

  const handleLanguageChange = useCallback(
    (lang: string) => {
      updateAttributes({ language: lang });
      setShowDropdown(false);
    },
    [updateAttributes]
  );

  return (
    <NodeViewWrapper className="relative my-4">
      <div className="overflow-hidden rounded-lg bg-zinc-900">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-2">
          {/* Language selector */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
              onClick={() => setShowDropdown(!showDropdown)}
              onBlur={() => {
                // Delay to allow click on dropdown item
                setTimeout(() => setShowDropdown(false), 200);
              }}
            >
              {currentLabel}
              <ChevronDown className="h-3 w-3" />
            </button>

            {showDropdown && (
              <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-44 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-800 py-1 shadow-lg">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.value}
                    type="button"
                    className={`w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-zinc-700 ${
                      language === lang.value
                        ? "text-blue-400 font-medium"
                        : "text-zinc-300"
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleLanguageChange(lang.value);
                    }}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Copy button */}
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-400" />
                <span className="text-green-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Code content with line numbers */}
        <div className="flex overflow-x-auto">
          <LineNumbers text={node.textContent} />
          <NodeViewContent
            className={`flex-1 p-4 font-mono text-sm text-zinc-100 whitespace-pre language-${language}`}
          />
        </div>
      </div>
    </NodeViewWrapper>
  );
}

function LineNumbers({ text }: { text: string }) {
  const lines = text.split("\n");
  // Always show at least 1 line number
  const lineCount = Math.max(lines.length, 1);

  return (
    <div
      className="select-none border-r border-zinc-700 px-3 py-4 text-right font-mono text-sm text-zinc-600"
      aria-hidden="true"
    >
      {Array.from({ length: lineCount }, (_, i) => (
        <div key={i} className="leading-relaxed">
          {i + 1}
        </div>
      ))}
    </div>
  );
}
