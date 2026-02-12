"use client";

import { useState, useCallback, useMemo } from "react";
import { Check, Copy } from "lucide-react";
import { common, createLowlight } from "lowlight";
import { toHtml } from "hast-util-to-html";

const lowlight = createLowlight(common);

const LANGUAGE_LABELS: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  go: "Go",
  rust: "Rust",
  java: "Java",
  cpp: "C++",
  c: "C",
  csharp: "C#",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  bash: "Bash",
  shell: "Shell",
  json: "JSON",
  yaml: "YAML",
  markdown: "Markdown",
  xml: "XML",
  php: "PHP",
  ruby: "Ruby",
  swift: "Swift",
  kotlin: "Kotlin",
  dockerfile: "Dockerfile",
  graphql: "GraphQL",
  r: "R",
  lua: "Lua",
  perl: "Perl",
  scala: "Scala",
  haskell: "Haskell",
  plaintext: "Plain Text",
};

interface ContentRendererCodeBlockProps {
  language: string;
  code: string;
}

export function ContentRendererCodeBlock({
  language,
  code,
}: ContentRendererCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const highlightedHtml = useMemo(() => {
    try {
      const tree = lowlight.highlight(language || "plaintext", code);
      return toHtml(tree);
    } catch {
      // If the language is not registered, fall back to auto-detection
      try {
        const tree = lowlight.highlightAuto(code);
        return toHtml(tree);
      } catch {
        return code
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      }
    }
  }, [language, code]);

  const lines = code.split("\n");
  const lineCount = Math.max(lines.length, 1);
  const label = LANGUAGE_LABELS[language] || language || "Plain Text";

  return (
    <div className="not-prose my-4 overflow-hidden rounded-lg bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-2">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
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

      {/* Code with line numbers */}
      <div className="flex overflow-x-auto">
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
        <pre className="flex-1 p-4 font-mono text-sm text-zinc-100">
          <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
        </pre>
      </div>
    </div>
  );
}
