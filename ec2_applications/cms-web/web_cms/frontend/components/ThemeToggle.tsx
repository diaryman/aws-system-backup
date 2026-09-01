"use client";

import { Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "motion/react";

export default function ThemeToggle() {
    const [isDark, setIsDark] = useState(false);

    // Sync state from DOM class (set by FOUC-prevention script in layout.tsx)
    useEffect(() => {
        const checkDark = () => {
            setIsDark(document.documentElement.classList.contains("dark"));
        };
        checkDark();

        // Listen for external changes (e.g., system-preference sync, other tabs)
        const observer = new MutationObserver(checkDark);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });
        return () => observer.disconnect();
    }, []);

    const toggleTheme = () => {
        const nowDark = !isDark;
        if (nowDark) {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
        }
        setIsDark(nowDark);
    };

    return (
        <button
            onClick={toggleTheme}
            className="p-3 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white transition-colors glass rounded-2xl border border-gray-100 dark:border-white/10 hover:bg-white dark:hover:bg-white/5 group relative overflow-hidden"
            aria-label={isDark ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
            aria-pressed={isDark}
        >
            <motion.div
                initial={false}
                animate={{ y: isDark ? -40 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
                <Sun size={20} className="group-hover:rotate-45 transition-transform" />
            </motion.div>
            <motion.div
                initial={false}
                animate={{ y: isDark ? 0 : 40 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="absolute inset-0 flex items-center justify-center"
            >
                <Moon size={20} className="group-hover:-rotate-12 transition-transform text-accent" />
            </motion.div>
        </button>
    );
}
