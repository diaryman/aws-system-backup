"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import { Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { fetchAPI } from "@/lib/api";

interface ContactFormProps {
    domain?: string;
    showTypeSelector?: boolean;
}

export default function ContactForm({ domain = "localhost", showTypeSelector = true }: ContactFormProps) {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: "",
        category: "General Inquiry",
        domain: domain
    });

    const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("submitting");

        try {
            await fetchAPI("/contact-submissions", {}, {
                method: "POST",
                body: JSON.stringify({ data: formData })
            });
            setStatus("success");
            setFormData({ ...formData, name: "", email: "", subject: "", message: "" });
        } catch (error) {
            console.error("Submission error", error);
            setStatus("error");
            setErrorMessage("เกิดข้อผิดพลาดในการส่งข้อมูล โปรดลองใหม่อีกครั้ง");
        }
    };

    if (status === "success") {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-3xl p-8 text-center border"
                style={{ background: 'var(--accent-subtle)', borderColor: 'var(--accent-color)', borderWidth: 1 }}
            >
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--accent-glow)', color: 'var(--accent-color)' }}>
                    <CheckCircle size={40} />
                </div>
                <h3 className="text-2xl font-black mb-2 font-heading" style={{ color: 'var(--primary-color)' }}>ส่งข้อมูลสำเร็จ!</h3>
                <p className="mb-8" style={{ color: 'var(--accent-dark)' }}>เราได้รับข้อความของคุณแล้ว และจะติดต่อกลับโดยเร็วที่สุด</p>
                <button
                    onClick={() => setStatus("idle")}
                    className="px-6 py-3 text-white font-bold rounded-2xl transition-colors shadow-lg"
                    style={{ background: 'var(--accent-color)' }}
                >
                    ส่งข้อความอื่นเพิ่มเติม
                </button>
            </motion.div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">ชื่อ-สกุล</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 outline-none transition-all"
                        style={{ '--tw-ring-color': 'var(--accent-subtle)' } as React.CSSProperties}
                        placeholder="ระบุชื่อผู้ติดต่อ"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">อีเมล</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 outline-none transition-all"
                        style={{ '--tw-ring-color': 'var(--accent-subtle)' } as React.CSSProperties}
                        placeholder="email@example.com"
                    />
                </div>
            </div>

            {showTypeSelector && (
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">ประเภทการติดต่อ</label>
                    <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none"
                    >
                        <option value="General Inquiry">สอบถามข้อมูลทั่วไป</option>
                        <option value="Data Request">ขอใช้ข้อมูล (Data Request)</option>
                        <option value="Complaint">แจ้งเรื่องร้องเรียน</option>
                        <option value="DPO Contact">ติดต่อเจ้าหน้าที่ DPO</option>
                    </select>
                </div>
            )}

            <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">หัวข้อเรื่อง</label>
                <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    placeholder="ระบุหัวข้อเรื่องที่ต้องการติดต่อ"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">ข้อความ</label>
                <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                    placeholder="รายละเอียดเพิ่มเติม..."
                ></textarea>
            </div>

            {status === "error" && (
                <div className="flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-xl text-sm font-bold">
                    <AlertCircle size={18} />
                    {errorMessage}
                </div>
            )}

            <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full py-4 bg-primary text-white font-bold rounded-2xl hover:bg-accent transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ color: 'var(--primary-foreground)' }}
            >
                {status === "submitting" ? (
                    <>
                        <Loader2 size={20} className="animate-spin" /> กำลังส่งข้อมูล...
                    </>
                ) : (
                    <>
                        ส่งข้อความ <Send size={20} />
                    </>
                )}
            </button>
        </form>
    );
}
