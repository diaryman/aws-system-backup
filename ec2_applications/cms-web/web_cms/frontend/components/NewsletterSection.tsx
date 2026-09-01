"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, ArrowRight, CheckCircle2, Loader2, Bell, Sparkles } from "lucide-react";

interface Props {
    domain: string;
    siteName?: string;
    accentColor?: string;
}

export default function NewsletterSection({ domain, siteName, accentColor }: Props) {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");
    const [showName, setShowName] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setStatus("loading");
        setMessage("");

        try {
            const res = await fetch("/api/newsletter", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, domain }),
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setStatus("success");
                setMessage(data.message || "สมัครสำเร็จแล้ว!");
                setEmail("");
                setName("");
            } else {
                setStatus("error");
                setMessage(data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่");
            }
        } catch {
            setStatus("error");
            setMessage("ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่ภายหลัง");
        }
    };

    const isPDPA = domain.includes("pdpa");

    return (
        <section className="relative overflow-hidden bg-primary py-24 px-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/3 rounded-full blur-3xl" />
                {/* Grid pattern */}
                <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="nl-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M40 0H0V40" fill="none" stroke="white" strokeWidth="1" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#nl-grid)" />
                </svg>
            </div>

            <div className="max-w-3xl mx-auto relative z-10">
                <AnimatePresence mode="wait">
                    {status === "success" ? (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center"
                        >
                            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-emerald-500/30">
                                <CheckCircle2 size={40} className="text-emerald-400" />
                            </div>
                            <h3 className="text-3xl font-black text-white mb-3">ขอบคุณมากครับ! 🎉</h3>
                            <p className="text-white/70 text-lg mb-8">{message}</p>
                            <button
                                onClick={() => setStatus("idle")}
                                className="px-6 py-3 border border-white/20 text-white/80 rounded-2xl font-bold text-sm hover:bg-white/10 transition-all"
                            >
                                สมัครอีเมลอื่น
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                        >
                            {/* Header */}
                            <div className="text-center mb-10">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white/80 text-xs font-bold mb-6 border border-white/10 backdrop-blur-sm">
                                    <Bell size={12} className="text-accent" />
                                    {isPDPA ? "สมัครรับข้อมูล PDPA Updates" : "สมัครรับข่าวสาร DataGOV"}
                                </div>
                                <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
                                    ไม่พลาดข่าวสารสำคัญ
                                    <br />
                                    <span className="text-accent">ที่คุณควรรู้</span>
                                </h2>
                                <p className="text-white/60 text-lg max-w-xl mx-auto">
                                    {isPDPA
                                        ? "รับการอัปเดตกฎหมาย PDPA นโยบายความเป็นส่วนตัว และข้อมูลสำคัญโดยตรงในอีเมลของคุณ"
                                        : "รับการอัปเดตมาตรฐาน Data Governance นโยบายและข้อมูลสำคัญโดยตรงในอีเมลของคุณ"}
                                </p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-3">
                                <div className="flex flex-col md:flex-row gap-3">
                                    {showName && (
                                        <motion.input
                                            initial={{ opacity: 0, width: 0 }}
                                            animate={{ opacity: 1, width: "auto" }}
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="ชื่อของคุณ (ไม่บังคับ)"
                                            className="flex-1 bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-2xl px-6 py-4 font-medium focus:outline-none focus:border-accent/60 focus:bg-white/15 transition-all backdrop-blur-sm"
                                        />
                                    )}
                                    <div className="flex-1 relative">
                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            onFocus={() => setShowName(true)}
                                            placeholder="กรอกอีเมลของคุณที่นี่..."
                                            required
                                            className="w-full bg-white/10 border border-white/20 text-white placeholder-white/40 rounded-2xl pl-14 pr-6 py-4 font-medium focus:outline-none focus:border-accent/60 focus:bg-white/15 transition-all backdrop-blur-sm"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={status === "loading" || !email.trim()}
                                        className="flex items-center justify-center gap-2 px-8 py-4 bg-accent text-white rounded-2xl font-bold shadow-xl shadow-accent/30 hover:scale-105 transition-all disabled:opacity-60 disabled:scale-100 whitespace-nowrap"
                                    >
                                        {status === "loading" ? (
                                            <Loader2 size={20} className="animate-spin" />
                                        ) : (
                                            <>
                                                สมัครเลย
                                                <ArrowRight size={18} />
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Error message */}
                                <AnimatePresence>
                                    {status === "error" && message && (
                                        <motion.p
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="text-rose-300 text-sm font-medium text-center"
                                        >
                                            ⚠️ {message}
                                        </motion.p>
                                    )}
                                </AnimatePresence>

                                <p className="text-center text-white/30 text-xs mt-4">
                                    🔒 ข้อมูลของคุณปลอดภัย ไม่มีการแชร์กับบุคคลภายนอก และสามารถยกเลิกได้ทุกเมื่อ
                                </p>
                            </form>

                            {/* Stats */}
                            <div className="mt-12 grid grid-cols-3 gap-6 border-t border-white/10 pt-10">
                                {[
                                    { value: "1,200+", label: "ผู้สมัครแล้ว" },
                                    { value: "ทุกสัปดาห์", label: "ความถี่ส่ง" },
                                    { value: "100%", label: "ฟรีตลอดไป" },
                                ].map((stat, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="text-center"
                                    >
                                        <div className="text-2xl font-black text-white mb-1">{stat.value}</div>
                                        <div className="text-xs text-white/40 font-medium">{stat.label}</div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}
