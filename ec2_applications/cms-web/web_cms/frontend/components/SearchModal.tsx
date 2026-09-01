"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2, FileText, Newspaper, ArrowRight, Clock, TrendingUp, Mic, MicOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { getSiteParam, isPDPADomain } from "@/lib/siteConfig";

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    domain?: string;
}

interface SearchResult {
    id: number;
    documentId: string;
    title: string;
    excerpt?: string;
    type: "news" | "document";
    slug?: string;
    category?: string;
    publishedAt?: string;
}

// Highlight matching text
function Highlight({ text, query }: { text: string; query: string }) {
    if (!query.trim()) return <>{text}</>;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase() ? (
                    <mark key={i} className="bg-accent/20 text-accent rounded px-0.5 not-italic">
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </>
    );
}

export default function SearchModal({ isOpen, onClose, domain = "localhost" }: SearchModalProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [speechError, setSpeechError] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const siteParam = getSiteParam(domain);
    const isPdpa = isPDPADomain(domain);

    // Setup Speech Recognition
    useEffect(() => {
        if (typeof window !== "undefined") {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = true;
                recognitionRef.current.interimResults = true;
                recognitionRef.current.lang = "th-TH";

                let finalTranscript = "";

                recognitionRef.current.onresult = (event: any) => {
                    let interimTranscript = "";
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }
                    const fullTranscript = finalTranscript + interimTranscript;
                    setQuery(fullTranscript);

                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    debounceRef.current = setTimeout(() => performSearch(fullTranscript), 500);
                };

                recognitionRef.current.onerror = (event: any) => {
                    console.error("Speech recognition error", event.error);
                    if (event.error === "not-allowed") {
                        setSpeechError("ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตการเข้าถึงก่อนใช้งาน");
                    } else if (event.error === "no-speech") {
                        setSpeechError("ไม่ได้ยินเสียงของคุณ กรุณาลองใหม่อีกครั้ง");
                    } else if (event.error === "network") {
                        setSpeechError("การเชื่อมต่อมีปัญหา ไม่สามารถใช้งานพิมพ์ด้วยเสียงได้");
                    } else {
                        setSpeechError("เกิดข้อผิดพลาดในการรับเสียง กรุณาลองใหม่อีกครั้ง");
                    }
                    setIsListening(false);
                };

                recognitionRef.current.onend = () => {
                    setIsListening(false);
                };
            }
        }
    }, [isPdpa]);

    const toggleListening = () => {
        setSpeechError(null);
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            setQuery("");
            setResults([]);
            setHasSearched(false);
            try {
                recognitionRef.current?.start();
                setIsListening(true);
            } catch (err) {
                console.error("Failed to start speech recognition:", err);
                setSpeechError("ระบบไม่รองรับ หรือกรุณาอนุญาตให้เข้าถึงไมโครโฟน");
                setIsListening(false);
            }
        }
    };

    // Load recent searches from localStorage
    useEffect(() => {
        const stored = localStorage.getItem(`recent_searches_${siteParam}`);
        if (stored) {
            try { setRecentSearches(JSON.parse(stored)); } catch { }
        }
    }, [siteParam]);

    // Focus input when modal opens & lock scroll
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
            setTimeout(() => inputRef.current?.focus(), 200);
        } else {
            document.body.style.overflow = "unset";
        }
        return () => { document.body.style.overflow = "unset"; };
    }, [isOpen]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setQuery("");
                setResults([]);
                setHasSearched(false);
            }, 300);
        }
    }, [isOpen]);

    // Live search with debounce
    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim() || searchQuery.trim().length < 2) {
            setResults([]);
            setHasSearched(false);
            return;
        }

        setIsSearching(true);
        setHasSearched(true);

        try {
            const [articlesRes, docsRes] = await Promise.all([
                fetchAPI("/articles", {
                    filters: {
                        domain: { $eq: domain },
                        $or: [
                            { title: { $containsi: searchQuery } },
                            { content: { $containsi: searchQuery } },
                        ],
                    },
                    sort: ["publishedAt:desc"],
                    pagination: { pageSize: 5 },
                    populate: ["category"],
                }).catch(() => ({ data: [] })),
                fetchAPI("/policy-documents", {
                    filters: {
                        domain: { $eq: domain },
                        $or: [
                            { title: { $containsi: searchQuery } },
                            { description: { $containsi: searchQuery } },
                        ],
                    },
                    sort: ["createdAt:desc"],
                    pagination: { pageSize: 5 },
                    populate: ["category"],
                }).catch(() => ({ data: [] })),
            ]);

            const newsResults: SearchResult[] = (articlesRes.data || []).map((a: any) => ({
                id: a.id,
                documentId: a.documentId,
                title: a.title,
                excerpt: a.excerpt || a.content?.substring(0, 80) || "",
                type: "news" as const,
                slug: a.slug,
                category: a.category?.name || "",
                publishedAt: a.publishedAt,
            }));

            const docResults: SearchResult[] = (docsRes.data || []).map((d: any) => ({
                id: d.id,
                documentId: d.documentId,
                title: d.title,
                excerpt: d.description?.substring(0, 80) || "",
                type: "document" as const,
                slug: d.slug || d.documentId,
                category: d.category?.name || d.docType || "",
                publishedAt: d.publishedAt || d.createdAt,
            }));

            setResults([...newsResults, ...docResults]);
        } catch (err) {
            console.error("Search error:", err);
        } finally {
            setIsSearching(false);
        }
    }, [domain]);

    // Debounced change handler
    const handleQueryChange = (value: string) => {
        setQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => performSearch(value), 300);
    };

    // Save to recent searches
    const saveRecentSearch = (q: string) => {
        const trimmed = q.trim();
        if (!trimmed) return;
        const updated = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem(`recent_searches_${siteParam}`, JSON.stringify(updated));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        saveRecentSearch(query);
        router.push(`/news?q=${encodeURIComponent(query)}&site=${siteParam}`);
        onClose();
    };

    const handleResultClick = (result: SearchResult) => {
        saveRecentSearch(query);
        onClose();
    };

    const newsResults = results.filter((r) => r.type === "news");
    const docResults = results.filter((r) => r.type === "document");
    const hasResults = results.length > 0;
    const showEmpty = hasSearched && !isSearching && !hasResults;

    const popularTags = isPdpa
        ? ["สิทธิ์เจ้าของข้อมูล", "นโยบาย PDPA", "แบบฟอร์มคำขอ", "DPO", "การร้องเรียน"]
        : ["Data Catalog", "มาตรฐานข้อมูล", "Open Data", "ธรรมาภิบาล", "แบบฟอร์มขอใช้ข้อมูล"];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[200] backdrop-blur-[20px] bg-primary/30 flex items-start justify-center pt-[10vh] p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: -20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: -20 }}
                        transition={{ type: "spring", damping: 28, stiffness: 350 }}
                        className="w-full max-w-2xl rounded-[2.5rem] shadow-2xl border relative overflow-hidden"
                        style={{ backgroundColor: "var(--background)", borderColor: "var(--glass-border)" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Search Input */}
                        <form onSubmit={handleSubmit} className="relative border-b" style={{ borderColor: "var(--glass-border)" }}>
                            <div className="flex items-center gap-4 px-6 py-5">
                                {isSearching ? (
                                    <Loader2 size={24} className="text-accent animate-spin flex-shrink-0" />
                                ) : (
                                    <Search size={24} className="flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                                )}
                                <input
                                    ref={inputRef}
                                    id="search-input"
                                    type="text"
                                    value={query}
                                    onChange={(e) => handleQueryChange(e.target.value)}
                                    placeholder={isListening ? "กำลังฟัง..." : (isPdpa ? "ค้นหาข้อมูล PDPA..." : "ค้นหาข้อมูลธรรมาภิบาล...")}
                                    className="flex-1 text-xl font-bold bg-transparent border-none outline-none placeholder:opacity-40"
                                    style={{ color: "var(--foreground)" }}
                                />
                                <button
                                    type="button"
                                    onClick={toggleListening}
                                    className={`p-2 rounded-xl transition-all flex-shrink-0 relative group 
                                        ${isListening ? 'bg-red-50 text-red-500' : 'hover:bg-gray-100'}
                                    `}
                                    style={!isListening ? { color: "var(--text-muted)" } : {}}
                                    title="ค้นหาด้วยเสียง"
                                >
                                    {isListening ? (
                                        <>
                                            <span className="absolute inset-0 rounded-xl bg-red-400 animate-ping opacity-20"></span>
                                            <Mic size={20} className="relative z-10 animate-pulse" />
                                        </>
                                    ) : (
                                        <Mic size={20} className="relative z-10 group-hover:text-accent transition-colors" />
                                    )}
                                </button>
                                {query && (
                                    <button
                                        type="button"
                                        onClick={() => { setQuery(""); setResults([]); setHasSearched(false); inputRef.current?.focus(); }}
                                        className="p-2 rounded-xl hover:bg-gray-100 transition-all flex-shrink-0"
                                        style={{ color: "var(--text-muted)" }}
                                    >
                                        <X size={18} />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-2 rounded-xl hover:bg-gray-100 transition-all flex-shrink-0 md:hidden"
                                    style={{ color: "var(--text-muted)" }}
                                >
                                    <X size={20} />
                                </button>
                                <kbd className="hidden md:flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg border bg-gray-50 text-gray-400 border-gray-200">
                                    ESC
                                </kbd>
                            </div>

                            {/* Speech Error Banner */}
                            {speechError && (
                                <div className="px-6 py-2 bg-red-50 text-red-500 text-xs font-bold flex justify-between items-center bg-opacity-50">
                                    <span>{speechError}</span>
                                    <button onClick={() => setSpeechError(null)} className="hover:bg-red-100 p-1 rounded-md transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                        </form>

                        {/* Results / Default State */}
                        <div className="max-h-[60vh] overflow-y-auto">
                            <AnimatePresence mode="wait">
                                {/* Live Results */}
                                {hasSearched && !showEmpty && (
                                    <motion.div
                                        key="results"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="p-4 space-y-2"
                                    >
                                        {/* News Results */}
                                        {newsResults.length > 0 && (
                                            <div>
                                                <div className="flex items-center gap-2 px-3 py-2">
                                                    <Newspaper size={14} className="text-accent" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">ข่าวสาร ({newsResults.length})</span>
                                                </div>
                                                {newsResults.map((result) => (
                                                    <Link
                                                        key={result.id}
                                                        href={`/news/${result.slug || result.documentId}?site=${siteParam}`}
                                                        onClick={() => handleResultClick(result)}
                                                        className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all group"
                                                    >
                                                        <div className="w-10 h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center flex-shrink-0 transition-colors">
                                                            <Newspaper size={18} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-sm truncate" style={{ color: "var(--foreground)" }}>
                                                                <Highlight text={result.title} query={query} />
                                                            </p>
                                                            {result.excerpt && (
                                                                <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--text-muted)" }}>
                                                                    <Highlight text={result.excerpt} query={query} />
                                                                </p>
                                                            )}
                                                            {result.category && (
                                                                <span className="inline-block mt-1 px-2 py-0.5 bg-accent-subtle text-accent rounded-lg text-[10px] font-bold">{result.category}</span>
                                                            )}
                                                        </div>
                                                        <ArrowRight size={16} className="text-gray-300 group-hover:text-accent group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
                                                    </Link>
                                                ))}
                                            </div>
                                        )}

                                        {/* Document Results */}
                                        {docResults.length > 0 && (
                                            <div>
                                                <div className="flex items-center gap-2 px-3 py-2">
                                                    <FileText size={14} className="text-accent" style={{ opacity: 0.8 }} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">เอกสาร ({docResults.length})</span>
                                                </div>
                                                {docResults.map((result) => (
                                                    <Link
                                                        key={result.id}
                                                        href={`/documents/${result.slug || result.documentId}?site=${siteParam}`}
                                                        onClick={() => handleResultClick(result)}
                                                        className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-all group"
                                                    >
                                                        <div className="w-10 h-10 rounded-xl bg-accent-subtle text-accent flex items-center justify-center flex-shrink-0 transition-colors">
                                                            <FileText size={18} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-sm truncate" style={{ color: "var(--foreground)" }}>
                                                                <Highlight text={result.title} query={query} />
                                                            </p>
                                                            {result.excerpt && (
                                                                <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--text-muted)" }}>
                                                                    <Highlight text={result.excerpt} query={query} />
                                                                </p>
                                                            )}
                                                            {result.category && (
                                                                <span className="inline-block mt-1 px-2 py-0.5 bg-accent-subtle text-accent rounded-lg text-[10px] font-bold">{result.category}</span>
                                                            )}
                                                        </div>
                                                        <ArrowRight size={16} className="text-gray-300 group-hover:text-accent group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
                                                    </Link>
                                                ))}
                                            </div>
                                        )}

                                        {/* View All Button */}
                                        {hasResults && (
                                            <div className="pt-2 px-3">
                                                <Link
                                                    href={`/news?q=${encodeURIComponent(query)}&site=${siteParam}`}
                                                    onClick={() => { saveRecentSearch(query); onClose(); }}
                                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border font-bold text-sm transition-all hover:bg-gray-50 group"
                                                    style={{ borderColor: "var(--glass-border)", color: "var(--text-muted)" }}
                                                >
                                                    ดูผลการค้นหาทั้งหมดสำหรับ "{query}"
                                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                                </Link>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* Empty State */}
                                {showEmpty && (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="flex flex-col items-center justify-center py-16 px-8 text-center"
                                    >
                                        <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 mb-4">
                                            <Search size={36} />
                                        </div>
                                        <p className="font-bold text-gray-400 mb-1">ไม่พบผลการค้นหาสำหรับ</p>
                                        <p className="text-2xl font-black text-primary">"{query}"</p>
                                        <p className="text-sm text-gray-400 mt-3">ลองใช้คำอื่น หรือตรวจสอบการสะกดครับ</p>
                                    </motion.div>
                                )}

                                {/* Default: Recent + Popular */}
                                {!hasSearched && (
                                    <motion.div
                                        key="default"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="p-6 space-y-6"
                                    >
                                        {/* Recent Searches */}
                                        {recentSearches.length > 0 && (
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={14} style={{ color: "var(--text-muted)" }} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>ค้นหาล่าสุด</span>
                                                    </div>
                                                    <button
                                                        onClick={() => { setRecentSearches([]); localStorage.removeItem(`recent_searches_${siteParam}`); }}
                                                        className="text-[10px] font-bold text-gray-300 hover:text-rose-400 transition-colors"
                                                    >
                                                        ล้างทั้งหมด
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {recentSearches.map((s) => (
                                                        <button
                                                            key={s}
                                                            onClick={() => { setQuery(s); handleQueryChange(s); }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold border transition-all hover:border-accent hover:text-accent"
                                                            style={{ borderColor: "var(--glass-border)", color: "var(--text-muted)", backgroundColor: "var(--glass-bg)" }}
                                                        >
                                                            <Clock size={12} />
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Popular Tags */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <TrendingUp size={14} className="text-accent" />
                                                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>หัวข้อยอดนิยม</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {popularTags.map((tag) => (
                                                    <button
                                                        key={tag}
                                                        onClick={() => { setQuery(tag); handleQueryChange(tag); }}
                                                        className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:shadow-md"
                                                        style={{
                                                            backgroundColor: "var(--glass-bg)",
                                                            borderColor: "var(--glass-border)",
                                                            color: "var(--foreground)",
                                                            border: "1px solid var(--glass-border)"
                                                        }}
                                                    >
                                                        {tag}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: "var(--glass-border)" }}>
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                                {isPdpa ? "PDPA Center" : "DataGOV"} · ค้นหาทั่วทั้งเว็บไซต์
                            </p>
                            <div className="flex items-center gap-3 text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 rounded border text-[9px] bg-gray-50 border-gray-200">↵</kbd>
                                    ดูทั้งหมด
                                </span>
                                <span className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 rounded border text-[9px] bg-gray-50 border-gray-200">ESC</kbd>
                                    ปิด
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
