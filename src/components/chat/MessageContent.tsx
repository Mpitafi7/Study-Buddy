import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

/** Placeholder when a mermaid block is in the message: diagram is shown in the DiagramPanel, not in chat. */
function MermaidPlaceholder() {
  return (
    <div className="my-2 inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <span>Diagram shown in panel →</span>
    </div>
  );
}

const proseClass =
  "message-content text-sm whitespace-pre-wrap prose prose-invert prose-sm max-w-none " +
  "[&_.katex]:text-inherit [&_.katex]:text-base " +
  "[&_.katex-display]:flex [&_.katex-display]:justify-center [&_.katex-display]:overflow-x-auto [&_.katex-display]:py-2 " +
  "[&_.katex-display]:text-[1.1em]";

export function MessageContent({ content }: { content: string }) {
  if (!content) return null;

  const components: Components = {
    code({ className, children, ...props }) {
      const code = String(children ?? "").replace(/\n$/, "");
      const isMermaid =
        typeof className === "string"
          ? className.includes("language-mermaid")
          : Array.isArray(className) && className.some((c) => String(c).includes("mermaid"));
      if (isMermaid && code.trim()) {
        return <MermaidPlaceholder />;
      }
      return (
        <code className={typeof className === "string" ? className : className?.join(" ")} {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className={proseClass}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
