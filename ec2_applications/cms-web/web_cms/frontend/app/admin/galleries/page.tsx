"use client";

import Swal from "sweetalert2";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { fetchAPI, getStrapiMedia } from "@/lib/api";
import { Image as ImageIcon, Edit, Trash2, Plus, Search, Calendar, FolderHeart } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";

interface Gallery {
    id: number;
    documentId: string;
    title: string;
    description: string;
    publishedAt: string;
    domain: string;
    images?: any[];
}

export default function AdminGalleriesPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <GalleriesContent />
        </Suspense>
    );
}

function GalleriesContent() {
    const searchParams = useSearchParams();
    const siteParam = searchParams.get("site") || "main";
    const siteName = siteParam === "pdpa" ? "PDPA Center" : "DataGOV";
    const targetDomain = siteParam === "pdpa" ? "pdpa.localhost" : "localhost";

    const [galleries, setGalleries] = useState<Gallery[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const res = await fetchAPI("/galleries", {
                    populate: ["images"],
                    sort: ["publishedAt:desc"],
                });
                setGalleries(res.data || []);
            } catch (error) {
                console.error("Failed to load galleries", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [targetDomain]);

    const filteredGalleries = galleries.filter(gallery => {
        const matchesSearch = gallery.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSite = (gallery.domain || "localhost") === targetDomain;
        return matchesSearch && matchesSite;
    });

    const handleDelete = async (id: string) => {
        if (!confirm("คุณต้องการลบแกลเลอรี่นี้ใช่หรือไม่?")) return;
        try {
            await fetchAPI(`/galleries/${id}`, {}, { method: "DELETE" });
            setGalleries(galleries.filter((g) => g.documentId !== id));
        } catch (error) {
            console.error("Failed to delete gallery", error);
            Swal.fire({ icon: "error", title: "แจ้งเตือน", text: "ลบแกลเลอรี่ไม่สำเร็จ" });
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-primary font-heading tracking-tight">จัดการแกลเลอรี่ลูกเล่น</h1>
                    <p className="text-gray-400 font-medium">จัดการชุดรูปภาพสำหรับประกอบข่าวสารของ {siteName}</p>
                </div>
                <Link
                    href={`/admin/galleries/new?site=${siteParam}`}
                    className="px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm flex items-center gap-2 shadow-premium hover:bg-accent transition-all active:scale-95"
                >
                    <Plus size={18} /> สร้างแกลเลอรี่ใหม่
                </Link>
            </div>

            <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm">
                <div className="relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                    <input
                        type="text"
                        placeholder="ค้นหาแกลเลอรี่..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-primary/20 outline-none font-medium placeholder:text-gray-300 transition-all"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-64 bg-gray-100 rounded-[2.5rem] animate-pulse" />
                    ))
                ) : filteredGalleries.length > 0 ? (
                    filteredGalleries.map((gallery) => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={gallery.id}
                            className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-500"
                        >
                            <div className="aspect-video bg-gray-100 relative overflow-hidden">
                                {gallery.images && gallery.images.length > 0 ? (
                                    <motion.img
                                        src={getStrapiMedia(gallery.images[0].url) || ""}
                                        alt={gallery.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <ImageIcon size={48} />
                                    </div>
                                )}
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl text-[10px] font-black text-primary shadow-sm">
                                    {gallery.images?.length || 0} รูปภาพ
                                </div>
                            </div>
                            <div className="p-6">
                                <h3 className="font-bold text-lg text-primary line-clamp-1 mb-2">{gallery.title}</h3>
                                <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
                                    <Calendar size={14} />
                                    {new Date(gallery.publishedAt).toLocaleDateString("th-TH")}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/admin/galleries/edit/${gallery.documentId}?site=${siteParam}`}
                                        className="flex-1 py-3 bg-gray-50 text-primary rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all shadow-sm"
                                    >
                                        <Edit size={16} /> แก้ไขแกลเลอรี่
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(gallery.documentId)}
                                        className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm shadow-red-100"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="col-span-full py-20 text-center">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <FolderHeart size={40} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-400">ยังไม่มีแกลเลอรี่ลูกเล่น</h3>
                        <p className="text-sm text-gray-300 mt-2">เริ่มสร้างแกลเลอรี่เพื่อนำไปประกอบข่าวสารของคุณ</p>
                    </div>
                )}
            </div>
        </div>
    );
}
