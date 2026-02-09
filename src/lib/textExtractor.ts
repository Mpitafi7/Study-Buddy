import { extractTextFromPdf } from "./pdfText";
import mammoth from "mammoth";

export type SupportedFileType = "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "text/plain" | "text/markdown" | "text/csv";

export async function extractTextFromFile(file: File): Promise<string> {
    const type = file.type;

    // PDF
    if (type === "application/pdf") {
        return extractTextFromPdf(file);
    }

    // DOCX
    if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.endsWith(".docx")) {
        return extractTextFromDocx(file);
    }

    // Text / Markdown / CSV
    if (type.startsWith("text/") || file.name.endsWith(".md") || file.name.endsWith(".txt") || file.name.endsWith(".csv")) {
        return extractTextFromPlain(file);
    }

    throw new Error(`Unsupported file type: ${type}`);
}

async function extractTextFromDocx(file: File): Promise<string> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value; // The raw text
    } catch (e) {
        console.error("Docx extraction error:", e);
        throw new Error("Failed to extract text from Word document.");
    }
}

async function extractTextFromPlain(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            resolve(e.target?.result as string);
        };
        reader.onerror = (e) => reject(new Error("Failed to read text file."));
        reader.readAsText(file);
    });
}
