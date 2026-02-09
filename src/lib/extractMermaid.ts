const MERMAID_BLOCK = /```\s*mermaid\s*\n?([\s\S]*?)```/gi;

/**
 * Aggressively strips ALL non-basic mermaid syntax.
 * Called as a fallback when normal sanitization still fails.
 * Converts everything to only [] and {} nodes with --> arrows.
 */
function aggressiveCleanup(code: string): string {
  let lines = code.split("\n");
  const cleaned: string[] = [];
  let openSubgraphs = 0;

  for (const line of lines) {
    let l = line;
    const trimmed = l.trim();

    // Pass through graph declaration, subgraph, end, and empty lines
    if (/^(graph|flowchart)\s/i.test(trimmed) || trimmed === "" || trimmed.toLowerCase() === "end") {
      if (trimmed.toLowerCase() === "end") openSubgraphs--;
      cleaned.push(l);
      continue;
    }

    if (trimmed.toLowerCase().startsWith("subgraph")) {
      openSubgraphs++;
      cleaned.push(l);
      continue;
    }

    // Convert ALL non-standard node shapes to ["quoted label"]
    // ([text]) → ["text"]
    l = l.replace(/\(\[["']?([^"'\])]+)["']?\]\)/g, '["$1"]');
    // [(text)] → ["text"]
    l = l.replace(/\[\(["']?([^"'\])]+)["']?\)\]/g, '["$1"]');
    // {{text}} → ["text"]
    l = l.replace(/\{\{["']?([^"'}]+)["']?\}\}/g, '["$1"]');
    // (text) → ["text"]  — but NOT subgraph(...) or end(...)
    l = l.replace(/(\b[A-Za-z_]\w*)\(["']?([^"')]+)["']?\)/g, (_m, id: string, inner: string) => {
      const keywords = ["subgraph", "graph", "flowchart", "end", "style", "class", "click", "linkstyle", "direction"];
      if (keywords.includes(id.toLowerCase())) return _m;
      return `${id}["${inner.replace(/"/g, "'")}"]`;
    });
    // [/text/] → ["text"]
    l = l.replace(/\[\/["']?([^"'/\]]+)["']?\/\]/g, '["$1"]');
    // [\text\] → ["text"]
    l = l.replace(/\[\\["']?([^"'\\\]]+)["']?\\\]/g, '["$1"]');
    // ((text)) → ["text"]
    l = l.replace(/\(\(["']?([^"')]+)["']?\)\)/g, '["$1"]');

    // Fix any remaining unquoted [] labels
    l = l.replace(/\[([^\]"]+)\]/g, (_m, inner: string) => {
      if (inner.startsWith('"')) return `[${inner}]`;
      return `["${inner.replace(/"/g, "'")}"]`;
    });

    // Fix chained labels
    l = l.replace(/--\s*"([^"]*)"\s*--\s*([^-=.>][^->]*?)\s*(-->|==>|-.->)/g, '-- "$1: $2" $3');
    l = l.replace(/--\s+([^">\n][^->\n]*?)\s+--\s+([^">\n][^->\n]*?)\s*(-->|==>|-.->)/g, '-- "$1: $2" $3');

    // Convert all fancy arrows to simple -->
    l = l.replace(/==>/g, '-->');
    l = l.replace(/-\.->/g, '-->');

    cleaned.push(l);
  }

  // Close unclosed subgraphs
  while (openSubgraphs > 0) {
    cleaned.push("    end");
    openSubgraphs--;
  }

  return cleaned.join("\n");
}

/**
 * Primary sanitizer — fixes common issues while keeping rich syntax.
 */
function sanitizeMermaidCode(code: string): string {
  let lines = code.split("\n");
  const sanitizedLines: string[] = [];
  let openSubgraphs = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      sanitizedLines.push(line);
      continue;
    }

    if (trimmed.toLowerCase().startsWith("subgraph")) openSubgraphs++;
    if (trimmed.toLowerCase() === "end") openSubgraphs--;

    if (/^(graph|flowchart)\s+(TD|TB|LR|RL|BT)/i.test(trimmed)) {
      sanitizedLines.push(line);
      continue;
    }

    // Fix chained arrow labels
    line = line.replace(
      /--\s*"([^"]*)"\s*--\s*([^-=.>][^->]*?)\s*(-->|==>|-.->)/g,
      '-- "$1: $2" $3'
    );
    line = line.replace(
      /--\s+([^">\n][^->\n]*?)\s+--\s+([^">\n][^->\n]*?)\s*(-->|==>|-.->)/g,
      '-- "$1: $2" $3'
    );

    // Convert problematic shapes to ["quoted"]
    // ([text]) stadium
    line = line.replace(/\(\[["']?([^"'\])]+)["']?\]\)/g, '["$1"]');
    // [(text)] cylinder
    line = line.replace(/\[\(["']?([^"'\])]+)["']?\)\]/g, '["$1"]');
    // {{text}} hexagon
    line = line.replace(/\{\{["']?([^"'}]+)["']?\}\}/g, '["$1"]');
    // [/text/] and [\text\] parallelogram
    line = line.replace(/\[\/["']?([^"'/\]]+)["']?\/\]/g, '["$1"]');
    line = line.replace(/\[\\["']?([^"'\\\]]+)["']?\\\]/g, '["$1"]');
    // ((text)) double circle
    line = line.replace(/\(\(["']?([^"')]+)["']?\)\)/g, '["$1"]');

    // Fix [] labels with parentheses: [text (x)] → ["text x"]
    line = line.replace(/\[([^\]"]*[()][^\]"]*)\]/g, (_m, inner: string) => {
      const clean = inner.replace(/[()]/g, "").replace(/"/g, "'");
      return `["${clean}"]`;
    });

    // Fix double-nested quotes: ["['text']"] → ["text"]
    line = line.replace(/\["\[?'?([^"'\]]*)'?\]?"\]/g, '["$1"]');

    // Fix () stadium nodes with problematic content
    line = line.replace(/(\b[A-Za-z_]\w*)\(([^)]*[:"][^)]*)\)/g, (_m, id: string, inner: string) => {
      const keywords = ["subgraph", "graph", "flowchart", "end", "style", "class", "click", "linkstyle", "direction"];
      if (keywords.includes(id.toLowerCase())) return _m;
      return `${id}["${inner.replace(/"/g, "'")}"]`;
    });

    // Remove incomplete final lines
    if (i === lines.length - 1) {
      if (/(-{2,}|={2,}|\.-)>?\s*$/.test(trimmed) && !trimmed.includes("]") && !trimmed.includes(")") && !trimmed.includes("}")) {
        continue;
      }
    }

    sanitizedLines.push(line);
  }

  while (openSubgraphs > 0) {
    sanitizedLines.push("    end");
    openSubgraphs--;
  }

  return sanitizedLines.join("\n");
}

/** Get the last mermaid code block from a message. Returns [primaryCode, fallbackCode]. */
export function extractLastMermaid(content: string): string | null {
  if (!content) return null;

  const lower = content.toLowerCase();
  if (!lower.includes("```mermaid") && !lower.includes("``` mermaid")) return null;

  let lastRaw: string | null = null;
  MERMAID_BLOCK.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MERMAID_BLOCK.exec(content)) !== null) {
    const code = match[1].trim();
    if (code.length > 5) {
      lastRaw = code;
    }
  }

  if (!lastRaw) return null;
  return sanitizeMermaidCode(lastRaw);
}

/** Aggressive fallback cleanup for when primary sanitization fails. */
export function extractLastMermaidFallback(content: string): string | null {
  if (!content) return null;

  const lower = content.toLowerCase();
  if (!lower.includes("```mermaid") && !lower.includes("``` mermaid")) return null;

  let lastRaw: string | null = null;
  MERMAID_BLOCK.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MERMAID_BLOCK.exec(content)) !== null) {
    const code = match[1].trim();
    if (code.length > 5) {
      lastRaw = code;
    }
  }

  if (!lastRaw) return null;
  return aggressiveCleanup(lastRaw);
}
