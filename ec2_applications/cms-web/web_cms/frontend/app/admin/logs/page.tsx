"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { History, Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, FileText, User, Clock, CheckCircle2, AlertCircle, Trash2, PlusCircle, Edit, Download } from "lucide-react";
import { motion } from "motion/react";

export default function AdminLogsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LogsContent />
        </Suspense>
    );
}

function LogsContent() {
    const searchParams = useSearchParams();
    const siteParam = searchParams.get("site") || "main";
    const siteName = siteParam === "pdpa" ? "PDPA Center" : "DataGOV";
    const currentDomain = siteParam === "pdpa" ? "pdpa.localhost" : "localhost";

    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            try {
                const { fetchAPI } = await import("@/lib/api");
                const res = await fetchAPI("/audit-logs", {
                    filters: {
                        domain: currentDomain
                    },
                    sort: ["createdAt:desc"],
                    pagination: {
                        limit: 50
                    }
                });
                setLogs(res.data || []);
            } catch (err) {
                console.error("Failed to fetch logs:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [currentDomain]);

    const filteredLogs = logs.filter(log =>
        log.entityTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.contentType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getActionBadge = (action: string) => {
        switch (action) {
            case "CREATE":
                return { color: "", style: { background: 'var(--accent-subtle)', color: 'var(--accent-color)', borderColor: 'var(--accent-glow)' }, icon: <PlusCircle size={14} />, label: "เพิ่มข้อมูล" };
            case "UPDATE":
                return { color: "", style: { background: 'var(--accent-subtle)', color: 'var(--primary-color)', borderColor: 'var(--glass-border)' }, icon: <Edit size={14} />, label: "แก้ไขข้อมูล" };
            case "DELETE":
                return { color: "bg-rose-50 text-rose-600 border-rose-100", style: {}, icon: <Trash2 size={14} />, label: "ลบข้อมูล" };
            default:
                return { color: "bg-gray-50 text-gray-600 border-gray-100", style: {}, icon: <History size={14} />, label: action };
        }
    };

    const handleExport = () => {
        const exportData = filteredLogs.map(log => ({
            "กิจกรรม": log.action,
            "ประเภทเนื้อหา": log.contentType,
            "หัวข้อ": log.entityTitle,
            "ID ข้อมูล": log.entityId,
            "ผู้ดำเนินการ": log.userEmail || "System",
            "วัน-เวลา": new Date(log.createdAt).toLocaleString("th-TH")
        }));

        import("@/lib/export").then(mod => {
            mod.exportToExcel(exportData, `Audit_Logs_${siteParam}`, "Activity Logs");
        });
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-primary font-heading tracking-tight">ประวัติการใช้งาน (Audit Logs)</h1>
                    <p className="text-gray-400 font-medium">บันทึกกิจกรรมการแก้ไขข้อมูลทั้งหมดของ {siteName}</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest group"
                    >
                        <Download size={18} className="text-accent group-hover:scale-110 transition-transform" />
                        Export
                    </button>
                    <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ทั้งหมด</span>
                            <span className="text-lg font-black text-primary">{logs.length} รายการ</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-primary">
                            <History size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters & Table Wrapper */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                {/* Table Header Controls */}
                <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row gap-4 justify-between bg-gray-50/30">
                    <div className="relative group max-w-md w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="ค้นหาตามหัวข้อ, ประเภทเนื้อหา หรือผู้ใช้งาน..."
                            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:border-primary transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2">
                        <button className="px-5 py-3 bg-white border border-gray-100 text-gray-500 rounded-2xl text-xs font-bold hover:bg-gray-50 transition-all flex items-center gap-2">
                            <Filter size={16} /> กรองข้อมูล
                        </button>
                        <button className="px-5 py-3 bg-white border border-gray-100 text-gray-500 rounded-2xl text-xs font-bold hover:bg-gray-50 transition-all flex items-center gap-2">
                            <ArrowUpDown size={16} /> เรียงลำดับ
                        </button>
                    </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/20 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                                <th className="px-8 py-4">กิจกรรม</th>
                                <th className="px-8 py-4">ประเภทเนื้อหา</th>
                                <th className="px-8 py-4">ข้อมูลที่ถูกจัดการ</th>
                                <th className="px-8 py-4">ผู้ดำเนินการ</th>
                                <th className="px-8 py-4">วัน-เวลา</th>
                                <th className="px-8 py-4 text-center">สถานะ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-8 py-6 h-16 bg-gray-50/30"></td>
                                    </tr>
                                ))
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-16 text-center text-gray-400 font-medium italic">
                                        ไม่พบข้อมูลประวัติการใช้งาน
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => {
                                    const badge = getActionBadge(log.action);
                                    return (
                                        <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold leading-none ${badge.color}`} style={badge.style}>
                                                    {badge.icon}
                                                    {badge.label}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                        <FileText size={16} />
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-600 capitalize">{log.contentType?.replace("-", " ")}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="max-w-xs">
                                                    <p className="text-sm font-bold text-primary truncate">{log.entityTitle}</p>
                                                    <p className="text-[10px] text-gray-400 font-medium mt-0.5 uppercase tracking-tighter">ID: #{log.entityId}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center border" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-color)', borderColor: 'var(--accent-glow)' }}>
                                                        <User size={14} />
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-600">{log.userEmail || "System"}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2 text-gray-500">
                                                    <Clock size={14} className="text-gray-300" />
                                                    <span className="text-xs font-bold tabular-nums">
                                                        {new Date(log.createdAt).toLocaleString("th-TH", {
                                                            day: "2-digit",
                                                            month: "short",
                                                            year: "2-digit",
                                                            hour: "2-digit",
                                                            minute: "2-digit"
                                                        })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <div className="flex justify-center">
                                                    <CheckCircle2 size={18} style={{ color: 'var(--accent-color)' }} />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Placeholder */}
                <div className="p-6 border-t border-gray-50 flex items-center justify-between bg-gray-50/10">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Showing {filteredLogs.length} of {logs.length} logs
                    </p>
                    <div className="flex gap-2">
                        <button className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-300 hover:text-primary transition-all disabled:opacity-50" disabled>
                            <ChevronLeft size={18} />
                        </button>
                        <button className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center font-bold text-sm text-primary shadow-sm">
                            1
                        </button>
                        <button className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-300 hover:text-primary transition-all disabled:opacity-50" disabled>
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
