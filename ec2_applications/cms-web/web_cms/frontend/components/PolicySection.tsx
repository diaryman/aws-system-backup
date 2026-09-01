"use client";

import { useEffect, useState } from "react";
import { fetchAPI, getStrapiMedia } from "@/lib/api";
import Link from "next/link";
import { motion } from "motion/react";
import { BookOpen, Download, FileText, ArrowRight } from "lucide-react";

interface PolicyDocument {
    id: number;
    documentId: string;
    title: string;
    description: string;
    category: string;
    file: any;
    coverImage: any;
    domain: string;
}

export default function PolicySection({ domain = "localhost" }: { domain?: string }) {
    const [documents, setDocuments] = useState<PolicyDocument[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        loadDocuments();
    }, [domain]);

    const loadDocuments = async () => {
        try {
            // Fetch policies that are either "Policy" or "Standard" or "นโยบาย" or "มาตรฐาน"
            // For simplicity, we fetch recent policies and limit to 8 to display as highlight
            const res = await fetchAPI("/policies", {
                filters: { domain, isActive: true },
                sort: ["order:asc"],
                populate: ["file", "coverImage"],
                pagination: { pageSize: 8 }
            });
            setDocuments(res.data || []);
        } catch (error) {
            console.error("Error loading policy documents", error);
        } finally {
            setLoading(false);
        }
    };

    // If no real data, show a nice skeleton or empty state
    // But we will try to render beautiful book designs
    return (
        <section id="policy" className="py-32 section-mixed relative overflow-hidden border-y border-gray-100 dark:border-white/5 scroll-mt-premium">
            {/* Abstract background shapes */}
            <div className="absolute top-0 right-0 w-1/2 h-full -skew-x-12 transform translate-x-1/4" style={{ backgroundColor: 'var(--accent-subtle)' }}></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-[120px]" style={{ backgroundColor: 'var(--accent-glow)' }}></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16">
                    <span className="font-black tracking-[0.3em] uppercase text-xs mb-4 block" style={{ color: 'var(--accent-color)' }}>เอกสารและคู่มือ</span>
                    <h2 className="text-4xl md:text-5xl font-extrabold font-heading leading-tight" style={{ color: 'var(--foreground)' }}>
                        นโยบายและ<span style={{ color: 'var(--accent-color)' }}>มาตรฐาน</span>
                    </h2>
                    <p className="text-lg mt-6 leading-relaxed font-light max-w-2xl mx-auto" style={{ color: 'var(--text-muted)' }}>
                        ศูนย์รวมเอกสารนโยบาย มาตรฐาน และแนวทางปฏิบัติที่เกี่ยวข้องกับการบริหารจัดการข้อมูล
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-10">
                    {loading ? (
                        [1, 2, 3, 4].map((i) => (
                            <div key={i} className="animate-pulse bg-gray-100 dark:bg-white/5 rounded-2xl h-[400px]"></div>
                        ))
                    ) : documents.length > 0 ? (
                        documents.slice(0, 4).map((doc, idx) => {
                            const coverUrl = doc.coverImage?.url ? getStrapiMedia(doc.coverImage.url) : null;
                            const fileUrl = doc.file?.url ? `/api/files${doc.file.url}` : null;
                            const downloadUrl = doc.file?.url ? getStrapiMedia(doc.file.url) : null;

                            return (
                                <motion.div
                                    key={doc.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="group relative flex flex-col items-center"
                                >
                                    {/* Book styling */}
                                    <Link href={`/documents/${doc.documentId}`} className="block relative w-[160px] h-[226px] sm:w-[200px] sm:h-[282px] mb-6 transform transition-all duration-500 ease-out group-hover:-translate-y-4 group-hover:rotate-2 shadow-2xl group-hover:shadow-[0_20px_40px_-5px_var(--accent-glow)] rounded-r-lg rounded-l-sm overflow-hidden border-y border-r border-black/10">
                                        {/* Book Spine effect */}
                                        <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/20 to-transparent z-20"></div>
                                        <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-white/40 z-20"></div>

                                        {coverUrl ? (
                                            <img src={coverUrl} alt={doc.title} className="w-full h-full object-cover relative z-10" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-800 flex flex-col justify-center items-center p-4 text-center relative z-10 premium-gradient">
                                                <div className="w-10 h-10 border border-white/20 rounded-full flex items-center justify-center mb-4">
                                                    <BookOpen className="text-white/60" size={20} />
                                                </div>
                                                <h3 className="text-white font-bold text-sm sm:text-lg line-clamp-3">{doc.title}</h3>
                                                <p className="text-white/60 text-[10px] uppercase tracking-widest mt-4">Policy Book</p>
                                            </div>
                                        )}

                                        {/* Page edge effect behind */}
                                        <div className="absolute top-1 -right-2 bottom-1 w-2 bg-white rounded-r-sm shadow-inner -z-10 group-hover:w-3 transition-all duration-300"></div>
                                        <div className="absolute top-1.5 -right-3 bottom-1.5 w-1 bg-gray-200 rounded-r-sm shadow-inner -z-20 group-hover:w-2 transition-all duration-300"></div>
                                    </Link>

                                    <div className="text-center w-full px-2">
                                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md mb-3 inline-block" style={{ backgroundColor: 'var(--accent-subtle)', color: 'var(--accent-color)' }}>
                                            {doc.category || "General"}
                                        </span>
                                        <h3 className="font-bold text-sm sm:text-base leading-snug line-clamp-2 mb-4" style={{ color: 'var(--foreground)' }}>
                                            {doc.title}
                                        </h3>
                                        <div className="flex items-center justify-center gap-2">
                                            {fileUrl ? (
                                                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-full text-xs font-bold transition-colors flex items-center gap-1">
                                                    <FileText size={12} /> อ่าน
                                                </a>
                                            ) : (
                                                <span className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 rounded-full text-xs font-bold text-gray-400 flex items-center gap-1">
                                                    ไม่มีไฟล์
                                                </span>
                                            )}
                                            {downloadUrl && (
                                                <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center gap-1 border border-gray-200 hover:border-accent hover:text-accent">
                                                    <Download size={12} /> โหลด
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="col-span-full text-center py-12">
                            <p className="text-gray-400">ยังไม่มีเอกสารในหมวดหมู่นี้</p>
                        </div>
                    )}
                </div>

                <div className="mt-16 text-center">
                    <Link href="/documents" className="inline-flex items-center gap-2 font-bold hover:gap-3 transition-all text-sm group" style={{ color: 'var(--accent-color)' }}>
                        ดูเอกสารเผยแพร่ทั้งหมด
                        <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all" style={{ backgroundColor: 'var(--accent-subtle)' }}>
                            <ArrowRight size={16} />
                        </div>
                    </Link>
                </div>
            </div>
        </section>
    );
}
