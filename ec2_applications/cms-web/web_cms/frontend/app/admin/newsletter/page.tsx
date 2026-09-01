"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
    Mail, Search, Filter, Download, Trash2, UserCheck, UserX,
    RefreshCcw, CheckCircle2, XCircle, ChevronDown, Users, TrendingUp,
    CalendarDays, Tag, Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { exportToExcel } from "@/lib/export";

interface Subscriber {
    id: number;
    documentId: string;
    email: string;
    name?: string;
    isActive: boolean;
    source: string;
    subscribedAt: string;
    unsubscribedAt?: string;
    tags?: string[];
    createdAt: string;
}

export default function NewsletterPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <NewsletterContent />
        </Suspense>
    );
}

function NewsletterContent() {
    const searchParams = useSearchParams();
    const siteParam = searchParams.get("site") || "main";
    const domain = siteParam === "pdpa" ? "pdpa.localhost" : "localhost";
    const siteName = siteParam === "pdpa" ? "PDPA Center" : "DataGOV";

    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, thisMonth: 0 });
    const [addEmail, setAddEmail] = useState("");
    const [addName, setAddName] = useState("");
    const [adding, setAdding] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const showNote = (type: "success" | "error", text: string) => {
        setNotification({ type, text });
        setTimeout(() => setNotification(null), 3500);
    };

    const fetchSubscribers = useCallback(async () => {
        setLoading(true);
        try {
            const { fetchAPI } = await import("@/lib/api");
            const res = await fetchAPI("/newsletter-subscribers", {
                filters: { domain },
                sort: ["subscribedAt:desc"],
                pagination: { pageSize: 200 },
            });
            const data: Subscriber[] = res.data || [];
            setSubscribers(data);

            const now = new Date();
            const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            setStats({
                total: data.length,
                active: data.filter(s => s.isActive).length,
                inactive: data.filter(s => !s.isActive).length,
                thisMonth: data.filter(s => s.subscribedAt >= thisMonthStart).length,
            });
        } catch (err) {
            console.error("Failed to fetch subscribers:", err);
        } finally {
            setLoading(false);
        }
    }, [domain]);

    useEffect(() => { fetchSubscribers(); }, [fetchSubscribers]);

    const filtered = subscribers.filter(s => {
        const matchSearch = !searchQuery || s.email.toLowerCase().includes(searchQuery.toLowerCase()) || s.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStatus = filterStatus === "all" || (filterStatus === "active" && s.isActive) || (filterStatus === "inactive" && !s.isActive);
        return matchSearch && matchStatus;
    });

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filtered.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map(s => s.documentId)));
        }
    };

    const handleToggleActive = async (sub: Subscriber) => {
        try {
            const { fetchAPI } = await import("@/lib/api");
            await fetchAPI(`/newsletter-subscribers/${sub.documentId}`, {}, {
                method: "PUT",
                body: JSON.stringify({ data: { isActive: !sub.isActive, unsubscribedAt: sub.isActive ? new Date().toISOString() : null } }),
            });
            showNote("success", sub.isActive ? `ปิดใช้งาน ${sub.email} แล้ว` : `เปิดใช้งาน ${sub.email} แล้ว`);
            fetchSubscribers();
        } catch { showNote("error", "ไม่สามารถอัปเดตได้"); }
    };

    const handleDelete = async (sub: Subscriber) => {
        if (!confirm(`ต้องการลบ ${sub.email} ออกจากระบบหรือไม่?`)) return;
        try {
            const { fetchAPI } = await import("@/lib/api");
            await fetchAPI(`/newsletter-subscribers/${sub.documentId}`, {}, { method: "DELETE" });
            showNote("success", `ลบ ${sub.email} แล้ว`);
            fetchSubscribers();
        } catch { showNote("error", "ไม่สามารถลบได้"); }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`ต้องการลบ ${selectedIds.size} รายการที่เลือกหรือไม่?`)) return;
        try {
            const { fetchAPI } = await import("@/lib/api");
            await Promise.all([...selectedIds].map(id => fetchAPI(`/newsletter-subscribers/${id}`, {}, { method: "DELETE" })));
            setSelectedIds(new Set());
            showNote("success", `ลบ ${selectedIds.size} รายการเรียบร้อยแล้ว`);
            fetchSubscribers();
        } catch { showNote("error", "เกิดข้อผิดพลาด"); }
    };

    const handleAddManual = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addEmail.trim()) return;
        setAdding(true);
        try {
            const res = await fetch("/api/newsletter", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: addEmail.trim(), name: addName.trim() || undefined, domain }),
            });
            const data = await res.json();
            if (res.ok) {
                showNote("success", data.message || "เพิ่มสมาชิกสำเร็จ");
                setAddEmail(""); setAddName(""); setShowAddForm(false);
                fetchSubscribers();
            } else {
                showNote("error", data.error || "เกิดข้อผิดพลาด");
            }
        } catch { showNote("error", "ไม่สามารถเชื่อมต่อได้"); }
        finally { setAdding(false); }
    };

    const handleExport = () => {
        const toExport = filtered.map(s => ({
            "อีเมล": s.email,
            "ชื่อ": s.name || "-",
            "สถานะ": s.isActive ? "ใช้งาน" : "ยกเลิก",
            "แหล่งที่มา": s.source,
            "วันที่สมัคร": s.subscribedAt ? new Date(s.subscribedAt).toLocaleDateString("th-TH") : "-",
            "วันที่ยกเลิก": s.unsubscribedAt ? new Date(s.unsubscribedAt).toLocaleDateString("th-TH") : "-",
        }));
        exportToExcel(toExport, `newsletter_${siteParam}_${new Date().toISOString().slice(0, 10)}`);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-wrap gap-4 justify-between items-start">
                <div>
                    <h1 className="text-3xl font-black text-primary font-heading tracking-tight">จัดการ Newsletter</h1>
                    <p className="text-gray-400 font-medium mt-1">รายชื่อผู้สมัครรับข่าวสาร {siteName}</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-2 px-5 py-3 border-2 border-primary text-primary rounded-2xl font-bold text-sm hover:bg-primary/5 transition-all">
                        <Plus size={18} /> เพิ่มสมาชิก
                    </button>
                    <button onClick={handleExport} className="flex items-center gap-2 px-5 py-3 text-white rounded-2xl font-bold text-sm shadow-lg hover:scale-105 transition-all" style={{ background: 'var(--accent-color)' }}>
                        <Download size={18} /> Export Excel
                    </button>
                    <button onClick={fetchSubscribers} className="w-11 h-11 flex items-center justify-center border border-gray-100 rounded-2xl text-gray-400 hover:text-primary hover:border-primary/20 transition-all">
                        <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Notification */}
            <AnimatePresence>
                {notification && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold border ${notification.type === "error" ? "bg-rose-50 text-rose-600 border-rose-100" : ""}`}
                        style={notification.type === "success" ? { background: 'var(--accent-subtle)', color: 'var(--accent-color)', borderColor: 'var(--accent-glow)' } : {}}>
                        {notification.type === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                        {notification.text}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Form */}
            <AnimatePresence>
                {showAddForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm overflow-hidden">
                        <h3 className="font-bold text-primary mb-5 flex items-center gap-2"><Mail size={18} className="text-accent" /> เพิ่มสมาชิกใหม่</h3>
                        <form onSubmit={handleAddManual} className="flex flex-wrap gap-3">
                            <input type="text" value={addName} onChange={e => setAddName(e.target.value)} placeholder="ชื่อ (ไม่บังคับ)"
                                className="flex-1 min-w-[160px] px-4 py-3 bg-gray-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10" />
                            <input type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="อีเมล *" required
                                className="flex-1 min-w-[220px] px-4 py-3 bg-gray-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10" />
                            <button type="submit" disabled={adding} className="px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-accent transition-all disabled:opacity-60 flex items-center gap-2">
                                {adding ? <RefreshCcw size={16} className="animate-spin" /> : <Plus size={16} />} เพิ่ม
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {[
                    { icon: <Users size={22} />, label: "สมาชิกทั้งหมด", value: stats.total, primary: true },
                    { icon: <UserCheck size={22} />, label: "ใช้งานอยู่", value: stats.active, primary: false },
                    { icon: <UserX size={22} />, label: "ยกเลิกแล้ว", value: stats.inactive, rose: true },
                    { icon: <TrendingUp size={22} />, label: "เดือนนี้", value: stats.thisMonth, amber: true },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                        <div
                            className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center"
                            style={stat.rose ? { background: 'rgba(244,63,94,0.07)', color: '#f43f5e' } :
                                stat.amber ? { background: 'rgba(245,158,11,0.07)', color: '#f59e0b' } :
                                    stat.primary ? { background: 'var(--accent-subtle)', color: 'var(--primary-color)' } :
                                        { background: 'var(--accent-subtle)', color: 'var(--accent-color)' }}
                        >
                            {stat.icon}
                        </div>
                        <div className="text-3xl font-black text-primary">{stat.value.toLocaleString()}</div>
                        <div className="text-xs font-bold text-gray-400 mt-1">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters & Table */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                {/* Filter Bar */}
                <div className="p-6 border-b border-gray-50 flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ค้นหาอีเมล หรือชื่อ..."
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/10" />
                    </div>

                    <div className="flex bg-gray-50 rounded-2xl p-1">
                        {[
                            { id: "all", label: "ทั้งหมด" },
                            { id: "active", label: "ใช้งาน" },
                            { id: "inactive", label: "ยกเลิก" },
                        ].map(f => (
                            <button key={f.id} onClick={() => setFilterStatus(f.id as any)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterStatus === f.id ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-primary"}`}>
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {selectedIds.size > 0 && (
                        <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 px-4 py-3 bg-rose-50 text-rose-500 rounded-2xl font-bold text-xs hover:bg-rose-100 transition-all">
                            <Trash2 size={16} /> ลบ {selectedIds.size} รายการ
                        </motion.button>
                    )}

                    <span className="text-xs text-gray-400 font-bold ml-auto">{filtered.length.toLocaleString()} รายการ</span>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <Mail size={40} className="text-gray-200 mb-3" />
                        <p className="text-gray-400 font-bold">ยังไม่มีสมาชิก</p>
                        <p className="text-gray-300 text-sm mt-1">เพิ่มสมาชิกหรือรอให้มีผู้สมัครจากเว็บไซต์</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50/60">
                                    <th className="p-4 pl-6 text-left">
                                        <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0}
                                            onChange={toggleSelectAll}
                                            className="accent-primary w-4 h-4 cursor-pointer rounded" />
                                    </th>
                                    <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">อีเมล / ชื่อ</th>
                                    <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">สถานะ</th>
                                    <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">แหล่งที่มา</th>
                                    <th className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">วันที่สมัคร</th>
                                    <th className="p-4 pr-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((sub, i) => (
                                    <motion.tr
                                        key={sub.id}
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.02 }}
                                        className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors"
                                    >
                                        <td className="p-4 pl-6">
                                            <input type="checkbox" checked={selectedIds.has(sub.documentId)}
                                                onChange={() => toggleSelect(sub.documentId)}
                                                className="accent-primary w-4 h-4 cursor-pointer" />
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-sm text-primary">{sub.email}</div>
                                            {sub.name && <div className="text-xs text-gray-400 font-medium mt-0.5">{sub.name}</div>}
                                        </td>
                                        <td className="p-4">
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${!sub.isActive ? "bg-gray-100 text-gray-400" : ""}`}
                                                style={sub.isActive ? { background: 'var(--accent-subtle)', color: 'var(--accent-color)' } : {}}
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: sub.isActive ? 'var(--accent-color)' : '#9ca3af' }} />
                                                {sub.isActive ? "ใช้งาน" : "ยกเลิก"}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="px-3 py-1 rounded-full text-[10px] font-bold capitalize" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-color)' }}>{sub.source || "website"}</span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-400 font-medium">
                                            {sub.subscribedAt ? new Date(sub.subscribedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                                        </td>
                                        <td className="p-4 pr-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleToggleActive(sub)} title={sub.isActive ? "ปิดรับ" : "เปิดรับ"}
                                                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                                                    style={sub.isActive ? { background: 'rgba(245,158,11,0.08)', color: '#f59e0b' } : { background: 'var(--accent-subtle)', color: 'var(--accent-color)' }}
                                                >
                                                    {sub.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                                                </button>
                                                <button onClick={() => handleDelete(sub)} title="ลบ"
                                                    className="w-9 h-9 rounded-xl bg-rose-50 text-rose-400 flex items-center justify-center hover:bg-rose-100 hover:scale-110 transition-all">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
