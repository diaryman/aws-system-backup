import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Strip <think>...</think> blocks produced by reasoning models (e.g. DeepSeek, QwQ).
 * Also handles unclosed tags — everything after a lone <think> is discarded.
 */
function stripThink(text: string): string {
    // Remove complete <think>...</think> blocks (including multi-line)
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
    // Remove any trailing unclosed <think> block
    cleaned = cleaned.replace(/<think>[\s\S]*/gi, "");
    // Collapse excessive blank lines left behind
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
    return cleaned.trim();
}

/**
 * POST /api/ai-assist
 * Uses the same chatbot-config stored in Strapi to assist with content editing.
 * Body: { text: string, action: string, domain?: string }
 */
export async function POST(req: NextRequest) {
    try {
        const { text, action, domain = "localhost" } = await req.json();

        if (!text || !action) {
            return NextResponse.json({ error: "text and action are required" }, { status: 400 });
        }

        // 1. Load chatbot config from Strapi (same as the chatbot)
        const strapiUrl = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || "http://localhost:1337";
        const configRes = await fetch(
            `${strapiUrl}/api/chatbot-configs?filters[domain][$eq]=${domain}`,
            { headers: { "Content-Type": "application/json" } }
        );
        const configData = await configRes.json();

        let provider = "gemini";
        let apiKey = process.env.GEMINI_API_KEY || "";
        let modelName = "gemini-1.5-flash";
        let temperature = 0.7;

        if (configData?.data?.length > 0) {
            const cfg = configData.data[0];
            provider = cfg.provider || provider;
            apiKey = cfg.apiKey || apiKey;
            modelName = cfg.modelName || modelName;
            temperature = cfg.temperature ?? temperature;
        }

        if (!apiKey && provider !== "ollama") {
            return NextResponse.json({ error: "API Key not configured" }, { status: 500 });
        }

        // 2. Build system prompt based on action
        const actionPrompts: Record<string, string> = {
            improve: "ปรับปรุงข้อความต่อไปนี้ให้สละสลวย ไหลลื่น มีความเป็นมืออาชีพ และเหมาะสมสำหรับเนื้อหาสื่อสารองค์กรราชการ รักษาใจความเดิมไว้ แต่ปรับสำนวนและโครงสร้างให้ดีขึ้น ตอบกลับมาแค่ข้อความที่ปรับปรุงแล้ว ไม่ต้องอธิบายเพิ่มเติม",
            summarize: "สรุปย่อเนื้อหาต่อไปนี้ให้กระชับและครอบคลุมใจความสำคัญ ไม่เกิน 3-5 ประโยค ตอบกลับมาแค่ข้อความที่สรุปแล้ว ไม่ต้องอธิบายเพิ่มเติม",
            expand: "ขยายความและเพิ่มเติมรายละเอียดของเนื้อหาต่อไปนี้ให้ครบถ้วนและสมบูรณ์ยิ่งขึ้น โดยยังคงรักษาสไตล์ของผู้เขียนเอาไว้ ตอบกลับมาแค่ข้อความที่ขยายความแล้ว ไม่ต้องอธิบายเพิ่มเติม",
            translate_en: "แปลข้อความต่อไปนี้เป็นภาษาอังกฤษที่ถูกต้องและเป็นทางการ เหมาะสำหรับเอกสารราชการ ตอบกลับมาแค่ข้อความที่แปลแล้ว ไม่ต้องอธิบายเพิ่มเติม",
            fix_grammar: "ตรวจสอบและแก้ไขไวยากรณ์ การสะกดคำ และเครื่องหมายวรรคตอน ของข้อความต่อไปนี้ ตอบกลับมาแค่ข้อความที่แก้ไขแล้ว ไม่ต้องอธิบายเพิ่มเติม",
            formal: "เปลี่ยนสำนวนของข้อความต่อไปนี้ให้เป็นภาษาทางการและสุภาพยิ่งขึ้น เหมาะสมสำหรับการสื่อสารราชการ ตอบกลับมาแค่ข้อความที่ปรับแล้ว ไม่ต้องอธิบายเพิ่มเติม",
            bullets: "แปลงเนื้อหาต่อไปนี้เป็นรายการแบบหัวข้อย่อย (bullet points) ที่ชัดเจนและเป็นระเบียบ โดยใช้เครื่องหมาย - นำหน้าแต่ละข้อ ตอบกลับมาแค่รายการที่แปลงแล้ว ไม่ต้องอธิบายเพิ่มเติม",
        };

        const systemPrompt = actionPrompts[action] || actionPrompts.improve;
        const userMessage = text;

        // 3. Call AI provider (non-streaming)
        let result = "";

        if (provider === "gemini") {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: modelName || "gemini-1.5-flash",
                systemInstruction: systemPrompt,
            });
            const response = await model.generateContent(userMessage);
            result = response.response.text();

        } else if (provider === "openai") {
            const openai = new OpenAI({ apiKey });
            const completion = await openai.chat.completions.create({
                model: modelName || "gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage },
                ],
                temperature,
            });
            result = completion.choices[0]?.message?.content || "";

        } else if (provider === "ollama") {
            const ollamaUrl = apiKey || "http://localhost:11434";
            const ollamaRes = await fetch(`${ollamaUrl}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: modelName || "llama3",
                    stream: false,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userMessage },
                    ],
                }),
            });
            const ollamaData = await ollamaRes.json();
            result = ollamaData.message?.content || "";

        } else if (provider === "openthaigpt") {
            const baseUrl = "http://thaillm.or.th/api/openthaigpt/v1";
            const otgRes = await fetch(`${baseUrl}/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": apiKey,
                },
                body: JSON.stringify({
                    model: modelName || "/model",
                    stream: false,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userMessage },
                    ],
                    max_tokens: 2048,
                    temperature,
                }),
            });
            const otgData = await otgRes.json();
            result = otgData.choices?.[0]?.message?.content || "";
        }

        // 4. Strip <think>...</think> from reasoning models before returning
        return NextResponse.json({ result: stripThink(result) });

    } catch (error: any) {
        console.error("AI Assist error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
