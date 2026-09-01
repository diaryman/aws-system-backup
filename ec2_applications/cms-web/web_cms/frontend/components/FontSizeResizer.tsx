"use client";

import { Type } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

export default function FontSizeResizer() {
    const [open, setOpen] = useState(false);
    const [currentLevel, setCurrentLevel] = useState(0); // 0 = 100%, 1 = 110%, 2 = 120%
    const menuRef = useRef<HTMLDivElement>(null);

    // Initialize from localStorage and apply
    useEffect(() => {
        const saved = localStorage.getItem("dga-font-size");
        if (saved) {
            const level = Number(saved);
            setCurrentLevel(level);
            applyFontSize(level);
        }

        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const applyFontSize = (level: number) => {
        // Tailwind base size is usually 16px (100%)
        let scale = 100;
        if (level === -1) scale = 90;
        if (level === 0) scale = 100;
        if (level === 1) scale = 110;
        if (level === 2) scale = 120;

        document.documentElement.style.fontSize = `${scale}%`;
    };

    const setLevel = (level: number) => {
        setCurrentLevel(level);
        applyFontSize(level);
        localStorage.setItem("dga-font-size", String(level));
        setOpen(false);
    };

    return (
        <div ref={menuRef} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="p-3 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white transition-colors glass rounded-2xl border border-gray-100 dark:border-white/10 hover:bg-white dark:hover:bg-white/5"
                aria-label="ปรับขนาดตัวอักษร"
                aria-expanded={open}
                aria-haspopup="true"
            >
                <Type size={20} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 z-[100] bg-white dark:bg-gray-900 rounded-2xl shadow-premium border border-gray-100 dark:border-white/10 p-2 min-w-[180px] flex shadow-2xl"
                        role="menu"
                    >
                        <button
                            onClick={() => setLevel(-1)}
                            role="menuitem"
                            className={`flex-1 py-3 px-2 rounded-xl transition-colors font-bold ${currentLevel === -1 ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 dark:text-gray-300'}`}
                            aria-label="ตัวอักษรขนาดเล็ก ก-"
                        >
                            <span className="text-sm">ก-</span>
                        </button>
                        <button
                            onClick={() => setLevel(0)}
                            role="menuitem"
                            className={`flex-1 py-3 px-2 rounded-xl transition-colors font-bold ${currentLevel === 0 ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 dark:text-gray-300'}`}
                            aria-label="ตัวอักษรขนาดปกติ ก"
                        >
                            <span className="text-base">ก</span>
                        </button>
                        <button
                            onClick={() => setLevel(1)}
                            role="menuitem"
                            className={`flex-1 py-3 px-2 rounded-xl transition-colors font-bold ${currentLevel === 1 ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 dark:text-gray-300'}`}
                            aria-label="ตัวอักษรขนาดใหญ่ ก+"
                        >
                            <span className="text-lg">ก+</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
