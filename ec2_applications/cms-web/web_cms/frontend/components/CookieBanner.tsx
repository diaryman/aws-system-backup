"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Cookie, X, ChevronRight, Shield } from "lucide-react";
import Link from "next/link";

interface CookieConsentConfig {
    enabled: boolean;
    title: string;
    description: string;
    acceptAllLabel: string;
    rejectLabel: string;
    policyLink: string;
}

interface CookieBannerProps {
    config?: CookieConsentConfig;
    domain?: string;
}

const CONSENT_KEY = "cookie_consent";

export default function CookieBanner({ config, domain }: CookieBannerProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Show banner only if not already decided and config enables it
        if (!config?.enabled) return;
        const stored = localStorage.getItem(CONSENT_KEY);
        if (!stored) {
            // Small delay so it doesn't flash immediately on load
            const t = setTimeout(() => setVisible(true), 1200);
            return () => clearTimeout(t);
        }
    }, [config?.enabled]);

    if (!config?.enabled) return null;

    const handleAccept = () => {
        localStorage.setItem(CONSENT_KEY, JSON.stringify({ decision: "accepted", date: new Date().toISOString() }));
        setVisible(false);
    };

    const handleReject = () => {
        localStorage.setItem(CONSENT_KEY, JSON.stringify({ decision: "rejected", date: new Date().toISOString() }));
        setVisible(false);
    };

    // Derive site prefix for links (PDPa vs DataGOV)
    const sitePrefix = "";
    const policyHref = config.policyLink?.startsWith("http") ? config.policyLink : `${sitePrefix}${config.policyLink || "/cookie-policy"}`;

    return (
        <AnimatePresence>
            {visible && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[200]"
                    />

                    {/* Banner */}
                    <motion.div
                        initial={{ y: 120, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 120, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-[201] px-4 pb-4 md:pb-6"
                    >
                        <div className="max-w-4xl mx-auto bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden">
                            {/* Top accent stripe */}
                            <div className="h-1" style={{ background: "linear-gradient(to right, var(--primary-color), var(--accent-color))" }} />

                            <div className="p-6 md:p-8">
                                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                                    {/* Icon */}
                                    <div className="flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--accent-subtle)", color: "var(--accent-color)" }}>
                                        <Cookie size={26} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4">
                                            <h3 className="text-lg font-black font-heading text-gray-900">
                                                {config.title}
                                            </h3>
                                            <button
                                                onClick={handleReject}
                                                aria-label="ปิด"
                                                className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                                            {config.description}{" "}
                                            <Link
                                                href={policyHref}
                                                className="font-semibold hover:opacity-80 transition-opacity underline underline-offset-2"
                                                style={{ color: "var(--accent-color)" }}
                                            >
                                                นโยบายคุกกี้ <ChevronRight size={12} className="inline" />
                                            </Link>
                                        </p>
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex-shrink-0 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                        <button
                                            onClick={handleReject}
                                            className="px-5 py-3 rounded-2xl font-bold text-sm border-2 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all whitespace-nowrap"
                                        >
                                            {config.rejectLabel}
                                        </button>
                                        <button
                                            onClick={handleAccept}
                                            className="px-6 py-3 rounded-2xl font-bold text-sm text-white shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                                            style={{ background: "var(--primary-color)" }}
                                        >
                                            <Shield size={15} />
                                            {config.acceptAllLabel}
                                        </button>
                                    </div>
                                </div>

                                {/* PDPA badge */}
                                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ปฏิบัติตาม</span>
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: "var(--accent-subtle)", color: "var(--accent-color)" }}>
                                        พ.ร.บ.PDPA 2562
                                    </span>
                                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: "var(--accent-subtle)", color: "var(--accent-color)" }}>
                                        GDPR
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
