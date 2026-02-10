import { useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, AlertTriangle, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { extractLastMermaid, extractLastMermaidFallback } from "@/lib/extractMermaid";

/** Detect diagram type from raw mermaid code for styling/labels. */
export function getDiagramType(code: string): "mindmap" | "flowchart" | "sequence" | "other" {
  const t = code.trim().toLowerCase();
  if (t.startsWith("mindmap")) return "mindmap";
  if (t.startsWith("sequencediagram") || t.startsWith("sequence ")) return "sequence";
  if (t.startsWith("graph ") || t.startsWith("flowchart ") || t.startsWith("graph td") || t.startsWith("graph lr")) return "flowchart";
  return "other";
}

/** Mermaid config — optimized for complex diagrams with subgraphs */
const MERMAID_CONFIG = {
  startOnLoad: false,
  theme: "neutral",
  securityLevel: "loose",
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: "basis",
    nodeSpacing: 30,
    rankSpacing: 40,
    padding: 15,
    subGraphTitleMargin: { top: 10, bottom: 10 },
  },
  sequence: { useMaxWidth: true },
  themeVariables: {
    fontSize: "14px",
    fontFamily: "Inter, system-ui, sans-serif",
  },
};

function downloadSvg(svg: string, filename: string) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".svg") ? filename : `${filename}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadPng(svgString: string, filename: string) {
  const img = new Image();
  // Ensure the SVG string has the namespace
  let source = svgString.includes("xmlns")
    ? svgString
    : svgString.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');

  // CRITICAL: Remove foreignObject tags to prevent "Tainted canvases" error
  source = source.replace(/<foreignObject[\s\S]*?<\/foreignObject>/g, "");

  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  img.onload = () => {
    // High-res scale factor
    const scale = 3;

    const canvas = document.createElement("canvas");
    // Use natural dimensions or fallback to a reasonable default if missing
    const width = img.naturalWidth || 800;
    const height = img.naturalHeight || 600;

    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(url);
      return;
    }

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw image scaled
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      URL.revokeObjectURL(url);
      if (!blob) return;
      const pngUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
      document.body.appendChild(a); // Append to body for Firefox support
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(pngUrl);
    }, "image/png", 1.0); // Max quality
  };

  img.onerror = () => {
    console.error("Failed to load SVG for conversion");
    URL.revokeObjectURL(url);
  };

  img.src = url;
}

/** Clean up any mermaid error/temp elements left in the DOM */
function cleanupMermaidDOM(renderIds: string[]) {
  // Remove elements by render IDs
  for (const rid of renderIds) {
    const el = document.getElementById(rid);
    if (el) el.remove();
    // Mermaid sometimes adds a wrapper with 'd' prefix
    const dEl = document.getElementById(`d${rid}`);
    if (dEl) dEl.remove();
  }
  // Remove any leftover mermaid error SVGs from the body
  document.querySelectorAll('body > svg[id^="mermaid-"]').forEach(el => el.remove());
  document.querySelectorAll('body > div[id^="dmermaid-"]').forEach(el => el.remove());
  document.querySelectorAll('body > div[id^="d-mermaid"]').forEach(el => el.remove());
  // Remove error text elements that mermaid v11 injects
  document.querySelectorAll('body > #d-mermaid, body > [id*="mermaid"]').forEach(el => {
    if (el.textContent?.includes('Syntax error') || el.textContent?.includes('mermaid version')) {
      el.remove();
    }
  });
}

/** Try to render mermaid code. Returns SVG string or throws. Always cleans up DOM. */
async function tryRenderMermaid(mermaidCode: string, uniqueId: string, config: any): Promise<string> {
  const m = await import("mermaid");
  const mermaid = m.default;
  mermaid.initialize({ ...config, suppressErrorRendering: true });

  try {
    const result = await mermaid.render(uniqueId, mermaidCode.trim());
    // Clean up temp elements even on success
    cleanupMermaidDOM([uniqueId]);
    if (!result?.svg) throw new Error("Empty SVG output");
    return result.svg;
  } catch (err) {
    // Clean up error elements from the DOM
    cleanupMermaidDOM([uniqueId]);
    throw err;
  }
}

export function DiagramPanel({ content, highlightedNodeId }: { content: string | null; highlightedNodeId?: string | null }) {
  const svgRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [downloading, setDownloading] = useState<"svg" | "png" | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const id = useId().replace(/:/g, "-");
  const renderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRenderedCodeRef = useRef<string | null>(null);

  const code = content ? extractLastMermaid(content) : null;
  const fallbackCode = content ? extractLastMermaidFallback(content) : null;
  const diagramType = code ? getDiagramType(code) : null;
  const downloadBaseName = `studybuddy-diagram-${diagramType ?? "diagram"}-${Date.now()}`;

  // Debounced mermaid rendering with automatic fallback retry
  useEffect(() => {
    if (renderTimerRef.current) {
      clearTimeout(renderTimerRef.current);
    }

    if (!code) {
      setSvg(null);
      setError(false);
      setErrorMsg("");
      lastRenderedCodeRef.current = null;
      return;
    }

    if (code === lastRenderedCodeRef.current && svg) return;

    setIsRendering(true);

    renderTimerRef.current = setTimeout(async () => {
      const isDark = document.documentElement.classList.contains("dark");
      const config = {
        ...MERMAID_CONFIG,
        theme: isDark ? "dark" : "neutral",
        themeVariables: isDark
          ? { ...MERMAID_CONFIG.themeVariables, darkMode: true, background: "transparent", mainBkg: "transparent" }
          : MERMAID_CONFIG.themeVariables,
      };

      // Attempt 1: Try primary sanitized code
      try {
        const svgStr = await tryRenderMermaid(code, `mermaid-${id}-${Date.now()}`, config);
        setSvg(svgStr);
        setError(false);
        setErrorMsg("");
        lastRenderedCodeRef.current = code;
        setIsRendering(false);
        return;
      } catch (err1: any) {
        console.warn("Mermaid primary render failed, trying fallback:", err1.message);
      }

      // Attempt 2: Try aggressive fallback cleanup
      if (fallbackCode && fallbackCode !== code) {
        try {
          const svgStr = await tryRenderMermaid(fallbackCode, `mermaid-fb-${id}-${Date.now()}`, config);
          setSvg(svgStr);
          setError(false);
          setErrorMsg("");
          lastRenderedCodeRef.current = code; // Track original so we don't re-render
          setIsRendering(false);
          console.log("Mermaid fallback render succeeded");
          return;
        } catch (err2: any) {
          console.warn("Mermaid fallback also failed:", err2.message);
        }
      }

      // Both failed — show error
      setError(true);
      setErrorMsg("Diagram syntax could not be auto-fixed");
      setIsRendering(false);
    }, 800);

    return () => {
      if (renderTimerRef.current) {
        clearTimeout(renderTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, id]);

  // Effect to handle highlighting
  useEffect(() => {
    if (!svg || !highlightedNodeId) return;

    const container = document.querySelector(`.diagram-panel-inner`);
    if (!container) return;

    // Reset previous highlights
    container.querySelectorAll('.diagram-highlight').forEach(el => el.classList.remove('diagram-highlight'));

    // Find new node
    let target = container.querySelector(`[id^="${highlightedNodeId}"]`);

    if (target) {
      const shape = target.querySelector('polygon, rect, circle, path');
      if (shape) {
        shape.classList.add('diagram-highlight');
        (shape as HTMLElement).style.stroke = "#f59e0b";
        (shape as HTMLElement).style.strokeWidth = "3px";
        (shape as HTMLElement).style.filter = "drop-shadow(0 0 4px #f59e0b)";
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [svg, highlightedNodeId]);

  return (
    <div className="diagram-panel-wrap h-full flex flex-col rounded-xl border border-border/80 p-4 shadow-lg">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {diagramType === "mindmap" ? "Mind map" : diagramType === "flowchart" ? "Flowchart" : diagramType === "sequence" ? "Sequence" : "Diagram"}
        </h3>
        {svg && (
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={downloading !== null}
              onClick={() => {
                setDownloading("svg");
                downloadSvg(svg, downloadBaseName);
                setDownloading(null);
              }}
            >
              {downloading === "svg" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              SVG
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={downloading !== null}
              onClick={async () => {
                if (!code) return;
                setDownloading("png");
                try {
                  // Render a clean SVG without HTML labels for export
                  // This is CRITICAL to avoid "Tainted canvases" error
                  const exportConfig = {
                    ...MERMAID_CONFIG,
                    flowchart: { ...MERMAID_CONFIG.flowchart, htmlLabels: false },
                    fontFamily: "Inter, sans-serif" // Explicit font
                  };
                  const exportId = `mermaid-export-${Date.now()}`;
                  // We need to temporarily render this to get the SVG, but we don't need to show it
                  // The tryRenderMermaid function cleans up after itself
                  const cleanSvg = await tryRenderMermaid(code, exportId, exportConfig);

                  downloadPng(cleanSvg, downloadBaseName);
                  setTimeout(() => setDownloading(null), 500);
                } catch (err) {
                  console.error("Failed to generate export SVG", err);
                  setDownloading(null);
                }
              }}
            >
              {downloading === "png" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              PNG
            </Button>
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden diagram-panel-inner rounded-lg">
        <AnimatePresence mode="wait">
          {!code ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-muted-foreground text-center px-4"
            >
              Diagrams will appear here when StudyBuddy generates one. Try asking to "draw a flowchart" or "show a mindmap".
            </motion.p>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full p-3 space-y-2"
            >
              <div className="flex items-center gap-2 text-amber-500 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Diagram couldn't render ({errorMsg}). Raw code:</span>
              </div>
              <pre className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/50 overflow-x-auto max-h-[200px] whitespace-pre-wrap">
                {code}
              </pre>
            </motion.div>
          ) : svg ? (
            <Dialog>
              <DialogTrigger asChild>
                <div className="w-full h-full cursor-pointer hover:bg-muted/5 rounded-lg transition-colors group relative">
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Maximize2 className="h-5 w-5 text-muted-foreground bg-background/80 rounded p-0.5 shadow-sm" />
                  </div>
                  <motion.div
                    ref={svgRef}
                    key={svg.slice(0, 50)}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="diagram-svg-wrapper w-full p-2 [&_svg]:max-w-full [&_svg]:h-auto [&_.cluster_rect]:rx-8 [&_.cluster_rect]:opacity-80"
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-[90vw] md:max-w-4xl max-h-[90vh] overflow-y-auto w-full">
                <DialogTitle className="sr-only">Diagram View</DialogTitle>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Diagram View</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadSvg(svg, downloadBaseName)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      SVG
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!code) return;
                        try {
                          const exportConfig = {
                            ...MERMAID_CONFIG,
                            flowchart: { ...MERMAID_CONFIG.flowchart, htmlLabels: false },
                            fontFamily: "Inter, sans-serif"
                          };
                          const exportId = `mermaid-export-modal-${Date.now()}`;
                          const cleanSvg = await tryRenderMermaid(code, exportId, exportConfig);
                          downloadPng(cleanSvg, downloadBaseName);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      PNG
                    </Button>
                  </div>
                </div>
                <div
                  className="w-full flex justify-center [&_svg]:w-full [&_svg]:max-w-full [&_svg]:h-auto"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              </DialogContent>
            </Dialog>
          ) : (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 text-sm text-muted-foreground"
            >
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>{isRendering ? "Rendering diagram..." : "Waiting for diagram data..."}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
