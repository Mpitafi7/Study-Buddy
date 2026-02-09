import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
// Vite resolves this to the worker URL at build/dev time
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const doc = await getDocument({ data: arrayBuffer }).promise;
  const numPages = doc.numPages;

  // Create an array of page indices [1, 2, ..., numPages]
  const pageIndices = Array.from({ length: numPages }, (_, i) => i + 1);

  // Fetch all pages in parallel
  const pageTexts = await Promise.all(
    pageIndices.map(async (i) => {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      return textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
    })
  );

  return pageTexts.join("\n\n");
}
