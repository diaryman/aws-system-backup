"use client";

import { motion } from "motion/react";
import { Zap, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function NewsTicker({ domain = "localhost", announcement, notifications }: { domain?: string; announcement?: string; notifications?: string[] }) {
    const siteParam = domain === "pdpa.localhost" ? "pdpa" : "main";
    const defaultUpdates = [
        "ประกาศ: มาตรฐานการจัดการข้อมูลภาครัฐฉบับใหม่ ปี 2569 เริ่มประกาศใช้แล้ววันนี้",
        "กิจกรรม: ขอเชิญร่วมรับฟังสัมมนาออนไลน์หัวข้อ 'ธรรมาภิบาลข้อมูลยุค AI' ในวันที่ 25 มีนาคมนี้",
        "แจ้งเตือน: ปรับปรุงระบบ Data Catalog ในช่วงเวลา 22:00 - 02:00 น. ของวันเสาร์ที่ 15 กุมภาพันธ์",
    ];

    // Use notifications from admin if available, otherwise fall back to defaults
    const updates = (notifications && notifications.length > 0) ? notifications : (announcement ? [announcement, ...defaultUpdates] : defaultUpdates);

    return (
        <div className="fixed top-0 w-full z-[150] h-11 flex items-center border-b border-white/10 overflow-hidden" style={{ backgroundColor: 'var(--primary-color)' }}>
            <div className="flex-shrink-0 px-4 h-full flex items-center gap-2 z-10 shadow-xl relative" style={{ backgroundColor: 'var(--accent-color)' }}>
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                <span className="text-[10px] font-black font-heading uppercase tracking-widest" style={{ color: 'var(--primary-foreground)' }}>Live Updates</span>
                {/* Slant effect */}
                <div className="absolute top-0 -right-4 h-full w-8 skew-x-[20deg] z-[-1]" style={{ backgroundColor: 'var(--accent-color)' }}></div>
            </div>

            <div className="flex-1 overflow-hidden h-full flex items-center">
                <motion.div
                    animate={{ x: [0, -1200] }}
                    transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
                    className="flex gap-16 items-center whitespace-nowrap pl-8"
                >
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-16 items-center">
                            {updates.map((text, idx) => (
                                <div
                                    key={idx}
                                    className="text-xs font-bold flex items-center gap-3"
                                    style={{ color: 'var(--primary-foreground)' }}
                                >
                                    <span className="w-1 h-1 rounded-full bg-accent/50" />
                                    {text}
                                </div>
                            ))}
                        </div>
                    ))}
                </motion.div>
            </div>

            <div className="flex-shrink-0 px-6 z-10 hidden lg:block h-full flex items-center" style={{ background: 'linear-gradient(to left, var(--primary-color), var(--primary-color), transparent)' }}>
                <Link href={`/news?site=${siteParam}`} className="text-[10px] font-bold uppercase tracking-widest hover:text-accent transition-all flex items-center gap-1.5" style={{ color: 'var(--primary-foreground)' }}>
                    ดูข่าวทั้งหมด <ChevronRight size={12} />
                </Link>
            </div>
        </div>
    );
}
