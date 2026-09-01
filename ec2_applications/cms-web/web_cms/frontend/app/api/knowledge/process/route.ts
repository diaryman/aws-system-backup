import { NextRequest, NextResponse } from "next/server";
import { chunkText } from "@/lib/rag";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/knowledge/process
 * Receives text content (extracted from PDF/TXT on client side),
 * chunks it, and saves to Strapi.
 */
export async function POST(req: NextRequest) {
    try {
        const { content, title, domain, knowledgeId } = await req.json();

        if (!content || !title) {
            return NextResponse.json({ error: "Missing content or title" }, { status: 400 });
        }

        // 1. Chunk the text
        const chunks = chunkText(content, {
            chunkSize: 600,
            overlap: 100,
            minChunkSize: 50,
        });

        // 2. Save/update to Strapi
        const strapiUrl = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
        const token = process.env.STRAPI_API_TOKEN;
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const payload = {
            data: {
                title,
                domain: domain || "localhost",
                content: content.substring(0, 50000), // Store first 50K chars of raw content
                chunks: chunks.map(c => ({ id: c.id, text: c.text })),
                chunkCount: chunks.length,
                status: "ready",
            },
        };

        let result;
        if (knowledgeId) {
            // Update existing
            const res = await fetch(`${strapiUrl}/api/chatbot-knowledges/${knowledgeId}`, {
                method: "PUT",
                headers,
                body: JSON.stringify(payload),
            });
            result = await res.json();
        } else {
            // Create new
            const res = await fetch(`${strapiUrl}/api/chatbot-knowledges`, {
                method: "POST",
                headers,
                body: JSON.stringify(payload),
            });
            result = await res.json();
        }

        if (result.error) {
            throw new Error(result.error.message || "Strapi save failed");
        }

        return NextResponse.json({
            success: true,
            chunkCount: chunks.length,
            documentId: result.data?.documentId || knowledgeId,
            preview: chunks.slice(0, 3).map(c => c.text.substring(0, 100) + "..."),
        });
    } catch (error: any) {
        console.error("Knowledge process error:", error);
        return NextResponse.json(
            { error: error.message || "Processing failed" },
            { status: 500 }
        );
    }
}
