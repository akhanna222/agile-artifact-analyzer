import * as fs from "fs";
import * as path from "path";
import OpenAI from "openai";
import { storage } from "./storage";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface PdfDocConfig {
  fileName: string;
  docName: string;
}

const PDF_DOCS: PdfDocConfig[] = [
  {
    fileName: "Epic-Standards_1773058422357.pdf",
    docName: "Epic-Standards",
  },
  {
    fileName: "Feature-Standard_1773058422357.pdf",
    docName: "Feature-Standard",
  },
  {
    fileName: "The_Lighthouse-v21-20260305_114446_1773058422357.pdf",
    docName: "The_Lighthouse",
  },
];

async function extractPdfText(filePath: string): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

function splitIntoChunks(text: string, maxTokens: number = 800): string[] {
  const pages = text.split(/\f/);

  if (pages.length > 1) {
    const chunks: string[] = [];
    for (const page of pages) {
      const trimmed = page.trim();
      if (trimmed.length < 20) continue;
      if (trimmed.length > maxTokens * 5) {
        const subChunks = splitBySize(trimmed, maxTokens);
        chunks.push(...subChunks);
      } else {
        chunks.push(trimmed);
      }
    }
    return chunks;
  }

  return splitBySize(text, maxTokens);
}

function splitBySize(text: string, maxTokens: number): string[] {
  const approxCharsPerToken = 4;
  const maxChars = maxTokens * approxCharsPerToken;
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }

  if (current.trim().length > 20) {
    chunks.push(current.trim());
  }

  return chunks;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8000),
  });
  return response.data[0].embedding;
}

export async function processDocument(config: PdfDocConfig): Promise<{ pageCount: number }> {
  const filePath = path.join(process.cwd(), "attached_assets", config.fileName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`PDF file not found: ${filePath}`);
  }

  await storage.deleteReferenceDocumentsByName(config.docName);

  console.log(`Extracting text from ${config.fileName}...`);
  const text = await extractPdfText(filePath);
  const chunks = splitIntoChunks(text);

  console.log(`Processing ${chunks.length} chunks for ${config.docName}...`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const pageNumber = i + 1;

    try {
      const embedding = await generateEmbedding(chunk);
      await storage.addReferenceDocument({
        docName: config.docName,
        pageNumber,
        content: chunk,
        embedding,
      });
      console.log(`  Stored ${config.docName} chunk ${pageNumber}/${chunks.length}`);
    } catch (error) {
      console.error(`  Error processing chunk ${pageNumber} of ${config.docName}:`, error);
      await storage.addReferenceDocument({
        docName: config.docName,
        pageNumber,
        content: chunk,
        embedding: null,
      });
    }
  }

  return { pageCount: chunks.length };
}

export async function processAllDocuments(): Promise<{ results: { docName: string; pageCount: number; status: string }[] }> {
  const results: { docName: string; pageCount: number; status: string }[] = [];

  for (const config of PDF_DOCS) {
    try {
      console.log(`\nProcessing ${config.docName}...`);
      const result = await processDocument(config);
      results.push({ docName: config.docName, pageCount: result.pageCount, status: "success" });
      console.log(`Completed ${config.docName}: ${result.pageCount} chunks`);
    } catch (error) {
      console.error(`Failed to process ${config.docName}:`, error);
      results.push({ docName: config.docName, pageCount: 0, status: `error: ${(error as Error).message}` });
    }
  }

  return { results };
}

export function getAvailableDocuments(): PdfDocConfig[] {
  return PDF_DOCS.filter(doc => {
    const filePath = path.join(process.cwd(), "attached_assets", doc.fileName);
    return fs.existsSync(filePath);
  });
}
