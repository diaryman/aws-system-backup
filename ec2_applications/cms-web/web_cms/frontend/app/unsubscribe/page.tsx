"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";

function UnsubscribeContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [status, setStatus] = useState<"loading" | "success" | "error" | "invalid">("loading");
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!token) {
            setStatus("invalid");
            setMessage("ไม่พบ token สำหรับยกเลิกการสมัคร");
            return;
        }

        fetch(`/api/newsletter?token=${encodeURIComponent(token)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setStatus("success");
                    setMessage(data.message || "ยกเลิกการสมัครรับข่าวสารเรียบร้อยแล้ว");
                } else {
                    setStatus("error");
                    setMessage(data.error || "เกิดข้อผิดพลาด");
                }
            })
            .catch(() => {
                setStatus("error");
                setMessage("ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่ภายหลัง");
            });
    }, [token]);

    const icon = status === "loading"
        ? <Loader2 size={48} className="animate-spin text-gray-300" />
        : status === "success"
            ? <CheckCircle2 size={48} className="text-green-500" />
            : <XCircle size={48} className="text-rose-400" />;

    return (
        <main className="min-h-screen flex items-center justify-center px-6"
            style={{ background: "var(--background)" }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl p-12 max-w-md w-full text-center"
            >
                <div className="mb-6">{icon}</div>

                {status === "loading" ? (
                    <>
                        <h1 className="text-xl font-black text-primary font-heading mb-2">กำลังดำเนินการ...</h1>
                        <p className="text-gray-400 text-sm">กรุณารอสักครู่</p>
                    </>
                ) : status === "success" ? (
                    <>
                        <h1 className="text-2xl font-black text-primary font-heading mb-3">ยกเลิกสำเร็จแล้ว</h1>
                        <p className="text-gray-500 text-sm leading-relaxed mb-8">{message}</p>
                        <div className="p-4 rounded-2xl text-sm font-medium text-gray-400 bg-gray-50 mb-8">
                            คุณจะไม่ได้รับอีเมลข่าวสารจากเราอีกต่อไป<br />
                            หากต้องการสมัครใหม่ สามารถกลับไปสมัครได้ที่หน้าเว็บไซต์
                        </div>
                        <Link href="/"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold text-sm transition-all hover:opacity-90"
                            style={{ background: "var(--primary-color)" }}>
                            <Mail size={16} /> กลับหน้าแรก
                        </Link>
                    </>
                ) : (
                    <>
                        <h1 className="text-2xl font-black text-rose-500 font-heading mb-3">เกิดข้อผิดพลาด</h1>
                        <p className="text-gray-500 text-sm leading-relaxed mb-8">{message}</p>
                        <Link href="/"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold text-sm"
                            style={{ background: "var(--primary-color)" }}>
                            กลับหน้าแรก
                        </Link>
                    </>
                )}
            </motion.div>
        </main>
    );
}

export default function UnsubscribePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-gray-300" />
            </div>
        }>
            <UnsubscribeContent />
        </Suspense>
    );
}
