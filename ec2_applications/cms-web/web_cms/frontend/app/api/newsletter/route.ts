import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const STRAPI_URL = process.env.STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || "http://127.0.0.1:1337";
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || "";

export async function POST(req: NextRequest) {
    try {
        const { email, name, domain } = await req.json();

        if (!email || !email.includes("@")) {
            return NextResponse.json({ error: "กรุณากรอกอีเมลให้ถูกต้อง" }, { status: 400 });
        }
        if (!domain) {
            return NextResponse.json({ error: "Domain is required" }, { status: 400 });
        }

        // ตรวจสอบว่ามีอยู่แล้วหรือไม่
        const checkRes = await fetch(
            `${STRAPI_URL}/api/newsletter-subscribers?filters[email][$eq]=${encodeURIComponent(email)}&filters[domain][$eq]=${domain}`,
            { headers: { "Content-Type": "application/json", Authorization: `Bearer ${STRAPI_TOKEN}` } }
        );
        const checkData = await checkRes.json();

        if (checkData.data && checkData.data.length > 0) {
            const existing = checkData.data[0];
            if (existing.isActive) {
                return NextResponse.json({ error: "อีเมลนี้ได้สมัครรับข่าวสารแล้ว" }, { status: 409 });
            }
            // Re-activate if was unsubscribed
            await fetch(`${STRAPI_URL}/api/newsletter-subscribers/${existing.documentId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${STRAPI_TOKEN}` },
                body: JSON.stringify({ data: { isActive: true, unsubscribedAt: null, subscribedAt: new Date().toISOString() } }),
            });
            return NextResponse.json({ success: true, message: "ยินดีต้อนรับกลับ! คุณได้สมัครรับข่าวสารสำเร็จแล้ว 🎉" });
        }

        // สร้าง record ใหม่
        const token = crypto.randomBytes(32).toString("hex");
        const createRes = await fetch(`${STRAPI_URL}/api/newsletter-subscribers`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${STRAPI_TOKEN}` },
            body: JSON.stringify({
                data: {
                    email: email.toLowerCase().trim(),
                    name: name?.trim() || null,
                    domain,
                    isActive: true,
                    source: "website",
                    subscribedAt: new Date().toISOString(),
                    unsubscribeToken: token,
                    tags: [],
                },
            }),
        });

        if (!createRes.ok) {
            const err = await createRes.text();
            console.error("Strapi create subscriber error:", err);
            return NextResponse.json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "สมัครรับข่าวสารสำเร็จแล้ว! ขอบคุณมากครับ 🎉" });
    } catch (err: any) {
        console.error("Newsletter subscribe error:", err);
        return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
    }
}

// Unsubscribe via GET with token
export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

    try {
        const findRes = await fetch(
            `${STRAPI_URL}/api/newsletter-subscribers?filters[unsubscribeToken][$eq]=${token}`,
            { headers: { Authorization: `Bearer ${STRAPI_TOKEN}` } }
        );
        const findData = await findRes.json();

        if (!findData.data || findData.data.length === 0) {
            return NextResponse.json({ error: "ไม่พบข้อมูลการสมัคร" }, { status: 404 });
        }

        const sub = findData.data[0];
        await fetch(`${STRAPI_URL}/api/newsletter-subscribers/${sub.documentId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${STRAPI_TOKEN}` },
            body: JSON.stringify({ data: { isActive: false, unsubscribedAt: new Date().toISOString() } }),
        });

        return NextResponse.json({ success: true, message: "ยกเลิกการสมัครรับข่าวสารเรียบร้อยแล้ว" });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
