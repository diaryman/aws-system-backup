import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const { message, history, domain } = await req.json();

        // 1. Fetch Chatbot Config from Strapi
        const strapiUrl = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
        const configRes = await fetch(
            `${strapiUrl}/api/chatbot-configs?filters[domain][$eq]=${domain}`,
            { headers: { "Content-Type": "application/json" } }
        );
        const configData = await configRes.json();

        if (!configData.data || configData.data.length === 0) {
            return NextResponse.json({ error: "Chatbot not configured for this domain" }, { status: 404 });
        }

        const config = configData.data[0];
        if (!config.isEnabled) {
            return NextResponse.json({ error: "Chatbot is disabled" }, { status: 403 });
        }

        const { provider, apiKey, modelName, systemPrompt, temperature } = config;
        const maxTokens = config.maxTokens || 1024;
        const topP = config.topP || 0.9;
        const historyLength = config.historyLength || 10;
        const ragInstructions = config.ragInstructions || "";
        const fallbackMessage = config.fallbackMessage || "";
        const responseFormat = config.responseFormat || "concise";
        const responseLanguage = config.responseLanguage || "thai";
        const restrictedTopics: string[] = config.restrictedTopics || [];
        const showSources = config.showSources !== false;

        if (!apiKey && provider !== "ollama") {
            return NextResponse.json({ error: "API Key missing in configuration" }, { status: 500 });
        }

        // 2. RAG: Fetch Relevant Context from Knowledge Base + Strapi Content
        let context = "";
        let sourceNames: string[] = [];
        try {
            const qEnc = encodeURIComponent(message);

            // 2a. Fetch from Knowledge Base (uploaded documents)
            const knowledgeRes = await fetch(
                `${strapiUrl}/api/chatbot-knowledges?filters[domain][$eq]=${domain}&filters[isActive][$eq]=true&pagination[limit]=50`,
                { headers: { "Content-Type": "application/json" } }
            ).then(r => r.json()).catch(() => ({ data: [] }));

            // BM25 search across all knowledge chunks
            if (knowledgeRes.data && knowledgeRes.data.length > 0) {
                // Dynamically import rag utilities (server-side only)
                const { buildBM25Index, searchBM25 } = await import("@/lib/rag");

                // Collect all chunks from all knowledge docs
                const allChunks: { id: number; text: string; source: string }[] = [];
                for (const doc of knowledgeRes.data) {
                    const docChunks = doc.chunks || [];
                    for (const chunk of docChunks) {
                        allChunks.push({
                            id: allChunks.length,
                            text: chunk.text,
                            source: doc.title,
                        });
                    }
                }

                if (allChunks.length > 0) {
                    const ragChunks = allChunks.map((c, i) => ({
                        id: i,
                        text: c.text,
                        startIdx: 0,
                        endIdx: c.text.length,
                    }));

                    const index = buildBM25Index(ragChunks);
                    const results = searchBM25(message, ragChunks, index, 5);

                    if (results.length > 0) {
                        const knowledgeContext = results.map((r, i) => {
                            const srcDoc = allChunks[r.chunkIndex];
                            if (!sourceNames.includes(srcDoc.source)) sourceNames.push(srcDoc.source);
                            return `[${i + 1}] (จาก "${srcDoc.source}"): ${r.text}`;
                        }).join("\n\n");
                        context += `\n\n---\nข้อมูลจากฐานความรู้ (Knowledge Base):\n${knowledgeContext}`;
                    }
                }
            }

            // 2b. Also search articles & policies from Strapi (existing RAG)
            const [articlesRes, docsRes] = await Promise.all([
                fetch(
                    `${strapiUrl}/api/articles?filters[domain][$eq]=${domain}&filters[$or][0][title][$containsi]=${qEnc}&filters[$or][1][content][$containsi]=${qEnc}&pagination[limit]=3&fields[0]=title&fields[1]=content&fields[2]=excerpt`
                ).then(r => r.json()).catch(() => ({ data: [] })),
                fetch(
                    `${strapiUrl}/api/policy-documents?filters[domain][$eq]=${domain}&filters[$or][0][title][$containsi]=${qEnc}&filters[$or][1][description][$containsi]=${qEnc}&pagination[limit]=3&fields[0]=title&fields[1]=description`
                ).then(r => r.json()).catch(() => ({ data: [] })),
            ]);

            const contextItems = [
                ...(articlesRes.data || []).map((item: any) =>
                    `[ข่าว] "${item.title}": ${item.excerpt || item.content?.substring(0, 300) || ""}...`
                ),
                ...(docsRes.data || []).map((item: any) =>
                    `[เอกสาร] "${item.title}": ${item.description?.substring(0, 300) || ""}...`
                ),
            ];

            if (contextItems.length > 0) {
                context += `\n\n---\nข้อมูลเพิ่มเติมจากเว็บไซต์:\n${contextItems.join("\n\n")}`;
            }
        } catch (ragError) {
            console.error("RAG Context fetch failed:", ragError);
        }

        // 3. Build enhanced system prompt
        const langInstruction = responseLanguage === "english"
            ? "Respond in English."
            : responseLanguage === "auto"
                ? "ตอบในภาษาเดียวกับที่ผู้ใช้ถาม"
                : "ตอบด้วยภาษาไทย";

        const formatInstruction = responseFormat === "detailed"
            ? "ตอบอย่างละเอียดพร้อมอธิบายเพิ่มเติม"
            : responseFormat === "bullet_points"
                ? "ตอบเป็นข้อๆ (bullet points) อย่างชัดเจน"
                : "ตอบอย่างกระชับ ตรงประเด็น";

        const restrictedInstruction = restrictedTopics.length > 0
            ? `\nหัวข้อที่ห้ามตอบหรือแสดงความเห็น: ${restrictedTopics.join(", ")}. หากถูกถามเรื่องเหล่านี้ ให้ปฏิเสธอย่างสุภาพ.`
            : "";

        const sourceInstruction = showSources && sourceNames.length > 0
            ? `\nหากใช้ข้อมูลจากฐานความรู้ ให้ระบุแหล่งที่มาท้ายคำตอบ`
            : "";

        const ragPrompt = ragInstructions ? `\n\nคำแนะนำในการใช้ข้อมูลอ้างอิง:\n${ragInstructions}` : "";

        const fallbackInstruction = fallbackMessage
            ? `\nหากไม่มีข้อมูลเพียงพอ ให้ตอบว่า: "${fallbackMessage}"`
            : "";

        const finalSystemPrompt = `${systemPrompt || "คุณคือผู้ช่วยอัจฉริยะที่ช่วยตอบคำถามเกี่ยวกับข้อมูลขององค์กร"}${ragPrompt}${context}\n\n---\nคำชี้แจง: ${langInstruction} ${formatInstruction} สุภาพและเป็นมืออาชีพ${restrictedInstruction}${sourceInstruction}${fallbackInstruction}`;

        // 3. Create streaming response
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                // --- Think Block Filter ---
                // Strips <think>...</think> content from streamed output (used by reasoning models)
                let thinkBuffer = "";
                let inThink = false;

                const send = (rawChunk: string) => {
                    // Append to buffer for tag detection
                    thinkBuffer += rawChunk;

                    let output = "";

                    while (thinkBuffer.length > 0) {
                        if (inThink) {
                            // Looking for closing </think>
                            const closeIdx = thinkBuffer.indexOf("</think>");
                            if (closeIdx !== -1) {
                                // Found closing tag — discard everything up to and including it
                                thinkBuffer = thinkBuffer.slice(closeIdx + "</think>".length);
                                inThink = false;
                                // Strip leading newline after </think> if present
                                if (thinkBuffer.startsWith("\n")) thinkBuffer = thinkBuffer.slice(1);
                            } else {
                                // Still inside think block, wait for more chunks
                                break;
                            }
                        } else {
                            // Looking for opening <think>
                            const openIdx = thinkBuffer.indexOf("<think>");
                            if (openIdx !== -1) {
                                // Output everything before the tag
                                output += thinkBuffer.slice(0, openIdx);
                                thinkBuffer = thinkBuffer.slice(openIdx + "<think>".length);
                                inThink = true;
                            } else {
                                // No think tag — but guard against partial tag at end of buffer
                                // e.g. buffer ends with "<thi" — keep last 8 chars buffered
                                const guardLen = 8; // length of "<think>" - 1
                                if (thinkBuffer.length > guardLen) {
                                    output += thinkBuffer.slice(0, -guardLen);
                                    thinkBuffer = thinkBuffer.slice(-guardLen);
                                }
                                break;
                            }
                        }
                    }

                    if (output) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: output })}\n\n`));
                    }
                };

                // Flush remaining buffer when stream ends
                const flush = () => {
                    if (!inThink && thinkBuffer) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: thinkBuffer })}\n\n`));
                        thinkBuffer = "";
                    }
                };

                const done = () => {
                    flush();
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                    controller.close();
                };

                try {
                    if (provider === "gemini") {
                        const genAI = new GoogleGenerativeAI(apiKey);
                        const model = genAI.getGenerativeModel({
                            model: modelName || "gemini-1.5-flash",
                            systemInstruction: finalSystemPrompt,
                        });

                        const chat = model.startChat({
                            history: (history || []).slice(-historyLength)
                                .filter((h: any) => h.content?.trim())
                                .map((h: any) => ({
                                    role: h.role === "user" ? "user" : "model",
                                    parts: [{ text: h.content }],
                                })),
                            generationConfig: { temperature: temperature ?? 0.7, maxOutputTokens: maxTokens, topP },
                        });

                        const result = await chat.sendMessageStream(message);
                        for await (const chunk of result.stream) {
                            const text = chunk.text();
                            if (text) send(text);
                        }
                    } else if (provider === "openai") {
                        const openai = new OpenAI({ apiKey });
                        const completion = await openai.chat.completions.create({
                            model: modelName || "gpt-4o-mini",
                            stream: true,
                            messages: [
                                { role: "system", content: finalSystemPrompt },
                                ...(history || []).slice(-historyLength).map((h: any) => ({ role: h.role, content: h.content })),
                                { role: "user", content: message },
                            ],
                            temperature: temperature ?? 0.7,
                            max_tokens: maxTokens,
                            top_p: topP,
                        });

                        for await (const chunk of completion) {
                            const text = chunk.choices[0]?.delta?.content || "";
                            if (text) send(text);
                        }
                    } else if (provider === "ollama") {
                        const ollamaUrl = apiKey || "http://localhost:11434";
                        const ollamaRes = await fetch(`${ollamaUrl}/api/chat`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                model: modelName || "llama3",
                                stream: true,
                                messages: [
                                    { role: "system", content: finalSystemPrompt },
                                    ...(history || []).map((h: any) => ({ role: h.role, content: h.content })),
                                    { role: "user", content: message },
                                ],
                            }),
                        });

                        const reader = ollamaRes.body?.getReader();
                        const decoder = new TextDecoder();
                        if (reader) {
                            while (true) {
                                const { done: doneReading, value } = await reader.read();
                                if (doneReading) break;
                                const lines = decoder.decode(value).split("\n").filter(Boolean);
                                for (const line of lines) {
                                    try {
                                        const parsed = JSON.parse(line);
                                        if (parsed.message?.content) send(parsed.message.content);
                                    } catch { }
                                }
                            }
                        }
                    } else if (provider === "openthaigpt") {
                        // OpenThaiGPT API — OpenAI-compatible format but uses "apikey" header
                        const baseUrl = "http://thaillm.or.th/api/openthaigpt/v1";
                        const otgRes = await fetch(`${baseUrl}/chat/completions`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "apikey": apiKey,
                            },
                            body: JSON.stringify({
                                model: modelName || "/model",
                                stream: true,
                                messages: [
                                    { role: "system", content: finalSystemPrompt },
                                    ...(history || []).map((h: any) => ({ role: h.role, content: h.content })),
                                    { role: "user", content: message },
                                ],
                                max_tokens: 2048,
                                temperature: temperature ?? 0.3,
                            }),
                        });

                        if (!otgRes.ok) {
                            const errText = await otgRes.text().catch(() => "Unknown error");
                            throw new Error(`OpenThaiGPT API error ${otgRes.status}: ${errText}`);
                        }

                        const otgReader = otgRes.body?.getReader();
                        const otgDecoder = new TextDecoder();
                        if (otgReader) {
                            while (true) {
                                const { done: doneReading, value } = await otgReader.read();
                                if (doneReading) break;
                                const lines = otgDecoder.decode(value, { stream: true }).split("\n");
                                for (const line of lines) {
                                    const trimmed = line.trim();
                                    if (!trimmed || trimmed === "data: [DONE]") continue;
                                    if (trimmed.startsWith("data: ")) {
                                        try {
                                            const parsed = JSON.parse(trimmed.slice(6));
                                            const delta = parsed.choices?.[0]?.delta?.content || "";
                                            if (delta) send(delta);
                                        } catch { }
                                    }
                                }
                            }
                        }
                    } else {
                        send("ไม่รองรับ AI Provider นี้ครับ กรุณาตั้งค่าใหม่");
                    }
                } catch (err: any) {
                    console.error("AI Stream error:", err);
                    send(`\n\n❌ เกิดข้อผิดพลาด: ${err.message || "Internal Server Error"}`);
                }

                done();
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (error: any) {
        console.error("Chat API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
