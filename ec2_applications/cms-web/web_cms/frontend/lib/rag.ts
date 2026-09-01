/**
 * RAG Utilities — Text Chunking + BM25 Search
 * 
 * Used for processing uploaded documents into searchable chunks
 * and finding relevant context for chatbot responses.
 */

// ===============================
// TEXT CHUNKING
// ===============================

interface ChunkOptions {
    chunkSize?: number;     // Target characters per chunk (default: 600)
    overlap?: number;       // Overlap between chunks (default: 100)
    minChunkSize?: number;  // Minimum chunk size to keep (default: 50)
}

export interface TextChunk {
    id: number;
    text: string;
    startIdx: number;
    endIdx: number;
}

/**
 * Split text into overlapping chunks for RAG.
 * Tries to split at sentence/paragraph boundaries when possible.
 */
export function chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
    const {
        chunkSize = 600,
        overlap = 100,
        minChunkSize = 50,
    } = options;

    if (!text || text.trim().length < minChunkSize) {
        return text?.trim() ? [{ id: 0, text: text.trim(), startIdx: 0, endIdx: text.length }] : [];
    }

    // Clean text: normalize whitespace, remove excessive newlines
    const cleaned = text
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]+/g, " ")
        .trim();

    const chunks: TextChunk[] = [];
    let start = 0;
    let chunkId = 0;

    while (start < cleaned.length) {
        let end = Math.min(start + chunkSize, cleaned.length);

        // If not at the end, try to find a good break point
        if (end < cleaned.length) {
            // Try paragraph break first
            const paragraphBreak = cleaned.lastIndexOf("\n\n", end);
            if (paragraphBreak > start + chunkSize * 0.4) {
                end = paragraphBreak + 2; // Include the newline
            } else {
                // Try sentence break (Thai period ฯ or standard period/newline)
                const sentenceBreaks = [
                    cleaned.lastIndexOf("। ", end),
                    cleaned.lastIndexOf(". ", end),
                    cleaned.lastIndexOf("\n", end),
                    cleaned.lastIndexOf("ฯ ", end),
                    cleaned.lastIndexOf("? ", end),
                    cleaned.lastIndexOf("! ", end),
                ];
                const bestBreak = Math.max(...sentenceBreaks.filter(b => b > start + chunkSize * 0.3));
                if (bestBreak > 0) {
                    end = bestBreak + 1;
                }
            }
        }

        const chunkText = cleaned.slice(start, end).trim();
        if (chunkText.length >= minChunkSize) {
            chunks.push({
                id: chunkId++,
                text: chunkText,
                startIdx: start,
                endIdx: end,
            });
        }

        // Move start forward, accounting for overlap
        start = Math.max(start + 1, end - overlap);
    }

    return chunks;
}


// ===============================
// BM25 SEARCH
// ===============================

// Simple Thai word segmentation (split on spaces, punctuation, and common Thai patterns)
function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^\u0E00-\u0E7Fa-z0-9\s]/g, " ") // Keep Thai + Latin + numbers
        .split(/\s+/)
        .filter(t => t.length > 1); // Remove single chars
}

interface BM25Index {
    docs: string[][];          // Tokenized documents
    avgDl: number;              // Average document length
    docCount: number;
    idf: Map<string, number>;   // Inverse document frequency
}

/**
 * Build a BM25 index from an array of text chunks.
 */
export function buildBM25Index(chunks: TextChunk[]): BM25Index {
    const docs = chunks.map(c => tokenize(c.text));
    const docCount = docs.length;
    const avgDl = docs.reduce((sum, d) => sum + d.length, 0) / (docCount || 1);

    // Calculate IDF for each term
    const df = new Map<string, number>();
    for (const doc of docs) {
        const uniqueTerms = new Set(doc);
        for (const term of uniqueTerms) {
            df.set(term, (df.get(term) || 0) + 1);
        }
    }

    const idf = new Map<string, number>();
    for (const [term, freq] of df) {
        // BM25 IDF formula
        idf.set(term, Math.log((docCount - freq + 0.5) / (freq + 0.5) + 1));
    }

    return { docs, avgDl, docCount, idf };
}

/**
 * Search chunks using BM25 ranking.
 * Returns indices sorted by relevance score.
 */
export function searchBM25(
    query: string,
    chunks: TextChunk[],
    index: BM25Index,
    topK: number = 5,
    k1: number = 1.5,
    b: number = 0.75,
): { chunkIndex: number; score: number; text: string }[] {
    const queryTerms = tokenize(query);

    const scores: { chunkIndex: number; score: number; text: string }[] = [];

    for (let i = 0; i < index.docs.length; i++) {
        const doc = index.docs[i];
        const dl = doc.length;
        let score = 0;

        // Count term frequencies in this document
        const tf = new Map<string, number>();
        for (const term of doc) {
            tf.set(term, (tf.get(term) || 0) + 1);
        }

        for (const qTerm of queryTerms) {
            const termIdf = index.idf.get(qTerm) || 0;
            const termTf = tf.get(qTerm) || 0;

            if (termTf > 0 && termIdf > 0) {
                // BM25 scoring formula
                const numerator = termTf * (k1 + 1);
                const denominator = termTf + k1 * (1 - b + b * (dl / index.avgDl));
                score += termIdf * (numerator / denominator);
            }
        }

        if (score > 0) {
            scores.push({ chunkIndex: i, score, text: chunks[i].text });
        }
    }

    // Sort by score descending, return top K
    return scores
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}


// ===============================
// PROMPT TEMPLATES
// ===============================

export const PROMPT_TEMPLATES: Record<string, { label: string; labelTh: string; prompt: string }> = {
    custom: {
        label: "Custom",
        labelTh: "กำหนดเอง",
        prompt: "",
    },
    legal_expert: {
        label: "Legal Expert",
        labelTh: "ผู้เชี่ยวชาญด้านกฎหมาย",
        prompt: "คุณคือผู้เชี่ยวชาญด้านกฎหมายที่มีความรู้เชี่ยวชาญ ตอบคำถามอย่างแม่นยำตามหลักกฎหมาย อ้างอิงมาตรา พ.ร.บ. หรือระเบียบที่เกี่ยวข้อง หากไม่มั่นใจ ให้แจ้งให้ผู้ใช้ปรึกษานักกฎหมายโดยตรง ตอบด้วยภาษาที่ชัดเจน เป็นทางการแต่เข้าใจง่าย",
    },
    helpdesk: {
        label: "Help Desk",
        labelTh: "เจ้าหน้าที่ช่วยเหลือ",
        prompt: "คุณคือเจ้าหน้าที่ให้บริการช่วยเหลือ (Help Desk) มีหน้าที่ตอบคำถาม แนะนำขั้นตอนการดำเนินงาน และแก้ไขปัญหาเบื้องต้น พูดจาสุภาพ ใจเย็น และเป็นมืออาชีพ ถ้าไม่สามารถช่วยได้ ให้แนะนำช่องทางติดต่อเจ้าหน้าที่โดยตรง",
    },
    faq_bot: {
        label: "FAQ Bot",
        labelTh: "บอทถาม-ตอบ (FAQ)",
        prompt: "คุณคือบอทตอบคำถามที่พบบ่อย (FAQ) ตอบคำถามอย่างกระชับ ตรงประเด็น ใช้ภาษาที่เข้าใจง่าย หากมีหลายข้อมูลที่เกี่ยวข้อง ให้จัดเป็นข้อๆ หากไม่มีข้อมูลในฐานความรู้ ให้แจ้งว่ายังไม่มีคำตอบสำหรับคำถามนี้",
    },
    friendly_guide: {
        label: "Friendly Guide",
        labelTh: "ผู้นำทางมิตรภาพ",
        prompt: "คุณคือผู้ช่วยที่เป็นมิตรและอบอุ่น พูดจาสุภาพเหมือนเพื่อนที่ช่วยเหลือ ใช้ Emoji เล็กน้อยเพื่อความเป็นกันเอง อธิบายเรื่องยากให้เข้าใจง่าย ด้วยตัวอย่างและการเปรียบเทียบ",
    },
};
