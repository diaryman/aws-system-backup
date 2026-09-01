"use client";

import { useState, useRef, useEffect } from "react";
import { Share2, Link2, Check, Facebook, MessageCircle, Twitter } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ShareButtonProps {
    title: string;
    description?: string;
    url?: string;
}

export default function ShareButton({ title, description, url }: ShareButtonProps) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Web Share API (mobile / modern browser)
    const handleNativeShare = async () => {
        if (typeof navigator !== "undefined" && navigator.share) {
            try {
                await navigator.share({ title, text: description || title, url: shareUrl });
            } catch { /* user cancelled */ }
        } else {
            setOpen((v) => !v);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const ta = document.createElement("textarea");
            ta.value = shareUrl;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
        setOpen(false);
    };

    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(title);

    const shareLinks = [
        {
            label: "Facebook",
            icon: <Facebook size={16} />,
            color: "#1877f2",
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        },
        {
            label: "LINE",
            icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.121.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967C23.418 13.924 24 12.189 24 10.304z" />
                </svg>
            ),
            color: "#06c755",
            href: `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`,
        },
        {
            label: "X (Twitter)",
            icon: <Twitter size={16} />,
            color: "#000000",
            href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
        },
    ];

    return (
        <div ref={menuRef} className="relative print:hidden">
            {/* Trigger Button */}
            <button
                onClick={handleNativeShare}
                className="w-10 h-10 rounded-xl bg-gray-50 hover:bg-accent hover:text-white transition-all flex items-center justify-center text-gray-400"
                aria-label="แชร์บทความนี้"
                aria-expanded={open}
                aria-haspopup="true"
            >
                <Share2 size={18} />
            </button>

            {/* Dropdown menu (shown when Web Share API not available) */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 bottom-12 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden min-w-[180px]"
                        role="menu"
                        aria-label="Share options"
                    >
                        <div className="p-2 space-y-1">
                            {/* Copy Link */}
                            <button
                                onClick={handleCopy}
                                role="menuitem"
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                {copied
                                    ? <Check size={16} className="text-green-500" />
                                    : <Link2 size={16} className="text-gray-400" />
                                }
                                {copied ? "คัดลอกแล้ว!" : "คัดลอกลิงก์"}
                            </button>

                            <div className="h-px bg-gray-50 mx-2" />

                            {/* Social share links */}
                            {shareLinks.map((s) => (
                                <a
                                    key={s.label}
                                    href={s.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    role="menuitem"
                                    onClick={() => setOpen(false)}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                                    style={{ color: "inherit" }}
                                >
                                    <span style={{ color: s.color }}>{s.icon}</span>
                                    {s.label}
                                </a>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
