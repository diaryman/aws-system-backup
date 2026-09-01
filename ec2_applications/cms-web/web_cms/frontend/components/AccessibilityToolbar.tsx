"use client";

import { useState, useEffect } from "react";
import { Settings, Type, Eye, Moon, Monitor, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function AccessibilityToolbar() {
    const [isOpen, setIsOpen] = useState(false);

    // 0 = default (100%), -1 = smaller (90%), 1 = large (110%), 2 = x-large (120%)
    const [fontSize, setFontSize] = useState<number>(0);
    const [highContrast, setHighContrast] = useState(false);

    // Load config from localStorage
    useEffect(() => {
        const storedFs = localStorage.getItem("dga-font-size");
        if (storedFs) setFontSize(Number(storedFs));

        const hc = localStorage.getItem("dga-high-contrast");
        if (hc === "true") setHighContrast(true);
    }, []);

    // Apply Font Size
    useEffect(() => {
        let scale = 100;
        if (fontSize === -1) scale = 90;
        if (fontSize === 1) scale = 110;
        if (fontSize === 2) scale = 120;
        document.documentElement.style.fontSize = `${scale}%`;
        localStorage.setItem("dga-font-size", String(fontSize));
    }, [fontSize]);

    // Apply High Contrast
    useEffect(() => {
        const html = document.documentElement;
        if (highContrast) {
            html.classList.add("high-contrast");
            localStorage.setItem("dga-high-contrast", "true");
        } else {
            html.classList.remove("high-contrast");
            localStorage.setItem("dga-high-contrast", "false");
        }
    }, [highContrast]);

    const changeFontSize = (level: number) => setFontSize(level);
    const toggleHighContrast = () => setHighContrast(!highContrast);

    return (
        <div className="fixed left-0 top-1/2 -translate-y-1/2 z-[100] flex">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="bg-primary hover:bg-primary-dark text-white p-3 rounded-r-xl shadow-lg border border-l-0 border-white/10 flex flex-col items-center gap-2 group transition-all"
                aria-label="เครื่องมืออำนวยความสะดวก"
                aria-expanded={isOpen}
            >
                <Type size={20} className="group-hover:scale-110 transition-transform" />
            </button>

            {/* Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: -20, filter: "blur(4px)" }}
                        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, x: -20, filter: "blur(4px)" }}
                        className="ml-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl p-4 w-64"
                    >
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <Settings size={16} className="text-primary dark:text-accent" />
                            เครื่องมือการเข้าถึง (Accessibility)
                        </h3>

                        {/* Font Size */}
                        <div className="mb-4">
                            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2 block">ขนาดตัวอักษร</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => changeFontSize(fontSize > -1 ? fontSize - 1 : -1)}
                                    className="flex-1 py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium text-xs transition-colors"
                                    aria-label="ลดขนาดตัวอักษร"
                                >
                                    A-
                                </button>
                                <button
                                    onClick={() => changeFontSize(0)}
                                    className={`flex-1 py-1.5 px-2 font-medium text-sm transition-colors rounded ${fontSize === 0 ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
                                    aria-label="ขนาดตัวอักษรปกติ"
                                >
                                    A
                                </button>
                                <button
                                    onClick={() => changeFontSize(fontSize < 2 ? fontSize + 1 : 2)}
                                    className="flex-1 py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-medium text-base transition-colors"
                                    aria-label="เพิ่มขนาดตัวอักษร"
                                >
                                    A+
                                </button>
                            </div>
                        </div>

                        {/* Contrast */}
                        <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2 block">โหมดการมองเห็น</label>
                            <button
                                onClick={toggleHighContrast}
                                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded text-sm font-medium transition-colors ${highContrast ? 'bg-yellow-400 text-slate-900 border border-yellow-500 shadow-inner' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-transparent'}`}
                                aria-label="โหมดสีตัดกันสูง (High Contrast)"
                                aria-pressed={highContrast}
                            >
                                <EyeOff size={16} />
                                High Contrast
                            </button>
                        </div>

                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
