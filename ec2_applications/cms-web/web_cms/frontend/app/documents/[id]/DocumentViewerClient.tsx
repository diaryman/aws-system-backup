"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
    Download,
    FileText,
    ArrowLeft,
    Maximize2,
    Minimize2,
    ExternalLink,
    Calendar,
    Tag,
    HardDrive,
} from "lucide-react";
import Link from "next/link";
import PrintButton from "@/components/PrintButton";
import ShareButton from "@/components/ShareButton";

interface DocumentViewerClientProps {
    title: string;
    description?: string;
    category?: string;
    year?: number;
    fileUrl: string | null;
    proxyFileUrl?: string | null;
    isPdf: boolean;
    fileName: string;
    fileSize?: number;
    domain: string;
}

export default function DocumentViewerClient({
    title,
    description,
    category,
    year,
    fileUrl,
    proxyFileUrl,
    isPdf,
    fileName,
    fileSize,
    domain,
}: DocumentViewerClientProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const docsPath = domain === "pdpa.localhost" ? "/pdpa/documents" : "/documents";

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return "";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    };

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Back Button & Actions Bar */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
            >
                <Link
                    href={docsPath}
                    className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-primary transition-colors group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    กลับไปหน้าเอกสาร
                </Link>

                <div className="flex items-center gap-3">
                    <PrintButton label="พิมพ์" />
                    <ShareButton title={title} description={description} />
                    {fileUrl && (
                        <a
                            href={fileUrl}
                            download={fileName}
                            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-premium hover:bg-accent transition-all active:scale-95"
                        >
                            <Download size={16} />
                            ดาวน์โหลด
                        </a>
                    )}
                </div>
            </motion.div>

            {/* Document Info Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-[2.5rem] border border-gray-100 shadow-premium overflow-hidden"
            >
                {/* Header */}
                <div className="p-8 md:p-10 border-b border-gray-100">
                    <div className="flex items-start gap-5">
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
                            style={{
                                background: "var(--accent-subtle)",
                                color: "var(--accent-color)",
                            }}
                        >
                            <FileText size={28} />
                        </div>
                        <div className="flex-1 min-w-0">
                            {category && (
                                <span
                                    className="inline-block px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg mb-3"
                                    style={{
                                        background: "var(--accent-subtle)",
                                        color: "var(--accent-color)",
                                    }}
                                >
                                    {category}
                                </span>
                            )}
                            <h1 className="text-2xl md:text-3xl font-black font-heading text-primary leading-tight tracking-tight">
                                {title}
                            </h1>
                            {description && (
                                <p className="text-gray-500 mt-3 leading-relaxed max-w-3xl">
                                    {description}
                                </p>
                            )}

                            <div className="flex flex-wrap items-center gap-6 mt-5 text-xs font-bold text-gray-400">
                                {year && (
                                    <span className="flex items-center gap-1.5">
                                        <Calendar size={14} />
                                        พ.ศ. {year}
                                    </span>
                                )}
                                {category && (
                                    <span className="flex items-center gap-1.5">
                                        <Tag size={14} />
                                        {category}
                                    </span>
                                )}
                                {fileSize && (
                                    <span className="flex items-center gap-1.5">
                                        <HardDrive size={14} />
                                        {formatFileSize(fileSize)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* PDF Viewer */}
                {fileUrl && isPdf ? (
                    <div className={`relative ${isFullscreen ? "fixed inset-0 z-[100] bg-white" : ""}`}>
                        {/* Toolbar */}
                        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b border-gray-100">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                แสดงตัวอย่างเอกสาร
                            </span>
                            <div className="flex items-center gap-2">
                                <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-gray-400 hover:text-primary hover:bg-white rounded-lg transition-all"
                                    title="เปิดในแท็บใหม่"
                                >
                                    <ExternalLink size={16} />
                                </a>
                                <button
                                    onClick={() => setIsFullscreen(!isFullscreen)}
                                    className="p-2 text-gray-400 hover:text-primary hover:bg-white rounded-lg transition-all"
                                    title={isFullscreen ? "ย่อ" : "ขยายเต็มจอ"}
                                >
                                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* iframe PDF Viewer */}
                        <iframe
                            src={`${proxyFileUrl || fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                            className={`w-full border-0 ${isFullscreen ? "h-[calc(100vh-48px)]" : "h-[75vh]"}`}
                            title={title}
                        />
                    </div>
                ) : fileUrl ? (
                    /* Non-PDF file fallback */
                    <div className="p-12 text-center">
                        <div
                            className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center mb-6"
                            style={{
                                background: "var(--accent-subtle)",
                                color: "var(--accent-color)",
                            }}
                        >
                            <FileText size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-primary mb-2">
                            ไม่สามารถแสดงตัวอย่างไฟล์นี้ได้
                        </h3>
                        <p className="text-gray-400 mb-6">
                            ไฟล์ประเภทนี้ไม่รองรับการดูแบบออนไลน์ กรุณาดาวน์โหลดเพื่อเปิดอ่าน
                        </p>
                        <a
                            href={fileUrl}
                            download={fileName}
                            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl font-bold text-sm shadow-premium hover:bg-accent transition-all active:scale-95"
                        >
                            <Download size={18} />
                            ดาวน์โหลดเอกสาร ({formatFileSize(fileSize)})
                        </a>
                    </div>
                ) : (
                    /* No file */
                    <div className="p-12 text-center">
                        <div className="w-20 h-20 mx-auto bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
                            <FileText size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-400">ยังไม่มีไฟล์แนบสำหรับเอกสารนี้</h3>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
