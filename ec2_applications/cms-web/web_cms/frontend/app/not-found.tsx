"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Home, Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { fetchAPI } from "@/lib/api";
import { getDomainFromWindow, DATAGOV_URL, PDPA_URL } from "@/lib/siteConfig";

export default function NotFound() {
    const router = useRouter();
    const [config, setConfig] = useState({
        title: "ไม่พบหน้าที่คุณต้องการ",
        description: "หน้าที่คุณกำลังมองหาอาจถูกย้ายหรือลบออกแล้ว",
        buttonText: "กลับหน้าแรก"
    });

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const domain = getDomainFromWindow();
                const res = await fetchAPI("/site-configs", { filters: { domain } });
                const notFoundPage = res.data?.[0]?.notFoundPage;
                if (notFoundPage?.title) setConfig(notFoundPage);
            } catch { /* use defaults */ }
        };
        fetchConfig();
    }, []);

    return (
        <main className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--background)" }}>
            <div className="max-w-lg w-full text-center">
                {/* Animated 404 Number */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", duration: 0.6 }}
                    className="mb-8"
                >
                    <div className="relative inline-block">
                        <span className="text-[10rem] font-black font-heading leading-none select-none"
                            style={{
                                background: "linear-gradient(135deg, var(--primary-color), var(--accent-color))",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                                opacity: 0.15
                            }}>
                            404
                        </span>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-xl"
                                style={{ background: "linear-gradient(135deg, var(--primary-color), var(--accent-color))" }}>
                                <Search size={40} className="text-white" />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Text */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <h1 className="text-3xl font-black font-heading mb-3" style={{ color: "var(--foreground)" }}>
                        {config.title}
                    </h1>
                    <p className="text-gray-500 text-lg mb-8 leading-relaxed">
                        {config.description}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={() => router.back()}
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold border-2 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all"
                        >
                            <ArrowLeft size={18} /> ย้อนกลับ
                        </button>
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-2xl font-bold text-white shadow-lg hover:opacity-90 active:scale-95 transition-all"
                            style={{ background: "var(--primary-color)" }}
                        >
                            <Home size={18} /> {config.buttonText}
                        </Link>
                    </div>

                    {/* Quick links */}
                    <div className="mt-10 pt-8 border-t border-gray-100">
                        <p className="text-sm font-bold text-gray-400 mb-4">ลิงก์ที่อาจเป็นประโยชน์</p>
                        <div className="flex flex-wrap gap-3 justify-center">
                            {[
                                { label: "หน้าแรก DataGOV", href: DATAGOV_URL },
                                { label: "ข่าวสาร", href: "/news" },
                                { label: "เอกสาร", href: "/documents" },
                                { label: "ติดต่อเรา", href: "/contact" },
                                { label: "PDPA Center", href: PDPA_URL },
                            ].map(link => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80"
                                    style={{ background: "var(--accent-subtle)", color: "var(--accent-color)" }}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
