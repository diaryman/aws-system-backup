"use client";

import Swal from "sweetalert2";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { Tag, Edit, Trash2, Plus, Search, Filter, FolderTree, FileText, Megaphone } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";

interface Category {
    id: number;
    documentId: string;
    name: string;
    slug: string;
    type: string;
    domain: string;
}

export default function AdminCategoriesPage() {
    return (
        <Suspense fallback={<div>กำลังโหลด...</div>}>
            <CategoriesContent />
        </Suspense>
    );
}

function CategoriesContent() {
    const searchParams = useSearchParams();
    const siteParam = searchParams.get("site") || "main";
    const siteName = siteParam === "pdpa" ? "PDPA Center" : "DataGOV";
    const targetDomain = siteParam === "pdpa" ? "pdpa.localhost" : "localhost";

    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedType, setSelectedType] = useState("all");
    const [isAdding, setIsAdding] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [newCategory, setNewCategory] = useState({ name: "", type: "news" });

    const loadCategories = async () => {
        setLoading(true);
        try {
            const data = await fetchAPI("/categories", {
                filters: { domain: targetDomain },
                sort: ["type:asc", "name:asc"]
            });
            setCategories(data.data || []);
        } catch (error) {
            console.error("Failed to load categories", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, [targetDomain]);

    const handleAddOrEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCategory) {
                await fetchAPI(`/categories/${editingCategory.documentId}`, {}, {
                    method: "PUT",
                    body: JSON.stringify({
                        data: {
                            ...newCategory,
                            domain: targetDomain
                        }
                    })
                });
            } else {
                await fetchAPI("/categories", {}, {
                    method: "POST",
                    body: JSON.stringify({
                        data: {
                            ...newCategory,
                            domain: targetDomain
                        }
                    })
                });
            }
            setIsAdding(false);
            setEditingCategory(null);
            setNewCategory({ name: "", type: "news" });
            loadCategories();
        } catch (error) {
            Swal.fire({ icon: "info", title: "แจ้งเตือน", text: editingCategory ? "แก้ไขหมวดหมู่ไม่สำเร็จ" : "เพิ่มหมวดหมู่ไม่สำเร็จ" });
        }
    };

    const handleEditClick = (cat: Category) => {
        setEditingCategory(cat);
        setNewCategory({ name: cat.name, type: cat.type || 'news' });
        setIsAdding(true);
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingCategory(null);
        setNewCategory({ name: "", type: "news" });
    };

    const handleDelete = async (docId: string) => {
        if (!confirm("ต้องการลบหมวดหมู่นี้ใช่หรือไม่? บทความที่อยู่ในหมวดหมู่นี้จะกลายเป็นไม่มีหมวดหมู่")) return;
        try {
            await fetchAPI(`/categories/${docId}`, {}, { method: "DELETE" });
            setCategories(categories.filter(c => c.documentId !== docId));
        } catch (error) {
            Swal.fire({ icon: "error", title: "แจ้งเตือน", text: "ลบไม่สำเร็จ" });
        }
    };

    const filteredCategories = categories.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = selectedType === "all" || c.type === selectedType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-black text-primary font-heading tracking-tight">จัดการหมวดหมู่</h1>
                    <p className="text-gray-500">จัดการหมวดหมู่สำหรับข่าวสารและเอกสารของ {siteName}</p>
                </div>
                <button
                    onClick={() => {
                        setEditingCategory(null);
                        setNewCategory({ name: "", type: "news" });
                        setIsAdding(true);
                    }}
                    className="px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm flex items-center gap-2 shadow-premium hover:bg-accent transition-all active:scale-95"
                >
                    <Plus size={18} /> เพิ่มหมวดหมู่ใหม่
                </button>
            </div>

            {/* Quick Add Form */}
            {isAdding && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl"
                >
                    <form onSubmit={handleAddOrEdit} className="flex flex-col md:flex-row gap-6 items-end">
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">ชื่อหมวดหมู่</label>
                            <input
                                required
                                value={newCategory.name}
                                onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                                placeholder="เช่น ข่าวเด่น, ประกาศสำคัญ..."
                            />
                        </div>
                        <div className="w-full md:w-64 space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">ประเภท</label>
                            <select
                                value={newCategory.type}
                                onChange={e => setNewCategory({ ...newCategory, type: e.target.value })}
                                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none font-bold appearance-none cursor-pointer"
                            >
                                <option value="news">ข่าวสาร / กิจกรรม</option>
                                <option value="document">นโยบาย / เอกสาร</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-6 py-4 bg-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition-all"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="submit"
                                className="px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-accent transition-all"
                            >
                                บันทึก
                            </button>
                        </div>
                    </form>
                </motion.div>
            )}

            {/* Filters */}
            <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full md:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                    <input
                        type="text"
                        placeholder="ค้นหาหมวดหมู่..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-primary/20 outline-none font-medium placeholder:text-gray-300 transition-all"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <button
                        onClick={() => setSelectedType("all")}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${selectedType === "all" ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
                    >
                        ทั้งหมด
                    </button>
                    <button
                        onClick={() => setSelectedType("news")}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${selectedType === "news" ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
                    >
                        ข่าวสาร
                    </button>
                    <button
                        onClick={() => setSelectedType("document")}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${selectedType === "document" ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-gray-50 text-gray-500 hover:bg-gray-100"}`}
                    >
                        เอกสาร
                    </button>
                </div>
            </div>

            {/* Content Table */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50 text-left">
                                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest min-w-[200px]">ชื่อหมวดหมู่</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">ประเภท</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Slug</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-sans">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-8 py-6"><div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse"></div></td>
                                        <td className="px-6 py-6"><div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse"></div></td>
                                        <td className="px-6 py-6"><div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse"></div></td>
                                        <td className="px-6 py-6"><div className="h-4 bg-gray-100 rounded w-full animate-pulse"></div></td>
                                    </tr>
                                ))
                            ) : filteredCategories.length > 0 ? (
                                filteredCategories.map((cat) => (
                                    <tr key={cat.id} className="group transition-colors" style={{ ':hover': {} } as any} onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-subtle)')} onMouseLeave={e => (e.currentTarget.style.background = '')}>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-primary transition-all">
                                                    <Tag size={20} />
                                                </div>
                                                <span className="font-bold text-gray-800 group-hover:text-primary transition-colors">{cat.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                {cat.type === 'news' ? (
                                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: 'var(--accent-subtle)', color: 'var(--primary-color)' }}>
                                                        <Megaphone size={14} /> ข่าวสาร
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-color)' }}>
                                                        <FileText size={14} /> เอกสาร
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 font-mono text-xs text-gray-400">
                                            {cat.slug}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEditClick(cat)}
                                                    className="p-2 hover:opacity-70 rounded-lg transition-colors"
                                                    style={{ color: 'var(--primary-color)' }}
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cat.documentId)}
                                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="text-center py-20">
                                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                            <FolderTree size={40} />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-400">ไม่พบหมวดหมู่</h3>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
