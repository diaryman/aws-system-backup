"use client";

import Swal from "sweetalert2";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { LayoutTemplate, Edit, Trash2, Plus, GripVertical, Image as ImageIcon, ExternalLink, Columns } from "lucide-react";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface HeroSlide {
    id: number;
    documentId: string;
    title: string;
    subtitle: string;
    buttonText: string;
    isActive: boolean;
    displayOrder: number;
    image?: {
        url: string;
    };
}

export default function AdminHeroSlidesPage() {
    return (
        <Suspense fallback={<div>กำลังโหลด...</div>}>
            <HeroSlidesContent />
        </Suspense>
    );
}

function HeroSlidesContent() {
    const searchParams = useSearchParams();
    const siteParam = searchParams.get("site") || "main";
    const siteName = siteParam === "pdpa" ? "PDPA Center" : "DataGOV";
    const targetDomain = siteParam === "pdpa" ? "pdpa.localhost" : "localhost";

    const [slides, setSlides] = useState<HeroSlide[]>([]);
    const [loading, setLoading] = useState(true);

    const loadSlides = async () => {
        setLoading(true);
        try {
            const data = await fetchAPI("/hero-slides", {
                filters: { domain: targetDomain },
                populate: ["image"],
                sort: ["displayOrder:asc"]
            });
            setSlides(data.data || []);
        } catch (error) {
            console.error("Failed to load slides", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSlides();
    }, [targetDomain]);

    const handleDelete = async (docId: string) => {
        if (!confirm("ต้องการลบสไลด์นี้ใช่หรือไม่?")) return;
        try {
            await fetchAPI(`/hero-slides/${docId}`, {}, { method: "DELETE" });
            setSlides(slides.filter(s => s.documentId !== docId));
        } catch (err) {
            Swal.fire({ icon: "error", title: "แจ้งเตือน", text: "ลบไม่สำเร็จ" });
        }
    };

    const toggleStatus = async (slide: HeroSlide) => {
        try {
            await fetchAPI(`/hero-slides/${slide.documentId}`, {}, {
                method: "PUT",
                body: JSON.stringify({ data: { isActive: !slide.isActive } })
            });
            setSlides(slides.map(s => s.documentId === slide.documentId ? { ...s, isActive: !s.isActive } : s));
        } catch (err) {
            Swal.fire({ icon: "error", title: "แจ้งเตือน", text: "อัปเดตสถานะไม่สำเร็จ" });
        }
    };

    const [hasOrderChanged, setHasOrderChanged] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) {
            return;
        }

        const newOrder = Array.from(slides);
        const [reorderedItem] = newOrder.splice(result.source.index, 1);
        newOrder.splice(result.destination.index, 0, reorderedItem);

        setSlides(newOrder);
        setHasOrderChanged(true);
    };

    const saveNewOrder = async () => {
        setLoading(true);
        try {
            // Update each slide's displayOrder in Strapi
            await Promise.all(slides.map((slide, index) =>
                fetchAPI(`/hero-slides/${slide.documentId}`, {}, {
                    method: "PUT",
                    body: JSON.stringify({ data: { displayOrder: index + 1 } })
                })
            ));
            setHasOrderChanged(false);
            Swal.fire({ icon: "success", title: "สำเร็จ", text: "บันทึกลำดับสไลด์เรียบร้อยแล้ว", timer: 1500, showConfirmButton: false });
        } catch (err) {
            console.error("Failed to save order", err);
            Swal.fire({ icon: "error", title: "แจ้งเตือน", text: "เกิดข้อผิดพลาดในการบันทึกลำดับ" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            <div className="flex justify-between items-center text-sans">
                <div>
                    <h1 className="text-3xl font-black text-primary font-heading tracking-tight">จัดการ Hero Slider</h1>
                    <p className="text-gray-500">จัดการภาพแบนเนอร์ขนาดใหญ่หน้าแรกสำหรับ {siteName}</p>
                </div>
                <div className="flex gap-4">
                    {hasOrderChanged && (
                        <button
                            onClick={saveNewOrder}
                            className="px-6 py-3 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95" style={{ background: "var(--accent-color)" }}
                        >
                            <LayoutTemplate size={18} /> บันทึกลำดับใหม่
                        </button>
                    )}
                    <Link
                        href={`/admin/hero-slides/new?site=${siteParam}`}
                        className="px-6 py-3 bg-primary text-white rounded-2xl font-bold flex items-center gap-2 shadow-premium hover:bg-accent transition-all active:scale-95"
                    >
                        <Plus size={18} /> เพิ่มสไลด์ใหม่
                    </Link>
                </div>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl"></div>)}
                </div>
            ) : slides.length > 0 ? (
                <div className="space-y-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-4 flex items-center gap-2">
                        <Columns size={14} /> สามารถลาก (Drag and Drop) เพื่อจัดลำดับสไลด์ได้
                    </p>

                    {isMounted ? (
                        <DragDropContext onDragEnd={handleDragEnd}>
                            <Droppable droppableId="slides">
                                {(provided) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className="space-y-4"
                                    >
                                        {slides.map((slide, index) => (
                                            <Draggable key={slide.id.toString()} draggableId={slide.id.toString()} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className={`group bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex items-center gap-4 p-4 transition-all ${snapshot.isDragging ? "shadow-2xl scale-[1.02] ring-2 ring-primary/20 z-50" : "hover:shadow-md"
                                                            }`}
                                                    >
                                                        {/* Drag Handle */}
                                                        <div
                                                            {...provided.dragHandleProps}
                                                            className="flex items-center justify-center p-2 text-gray-300 hover:text-primary transition-colors cursor-grab active:cursor-grabbing hover:bg-gray-50 rounded-xl"
                                                        >
                                                            <GripVertical size={20} />
                                                        </div>

                                                        <div className="relative w-40 h-24 rounded-2xl overflow-hidden bg-gray-900 flex-shrink-0">
                                                            {slide.image ? (
                                                                <img
                                                                    src={`${process.env.NEXT_PUBLIC_STRAPI_URL}${slide.image.url}`}
                                                                    alt={slide.title}
                                                                    className="w-full h-full object-cover opacity-60"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-700 bg-gray-800">
                                                                    <ImageIcon size={24} />
                                                                </div>
                                                            )}
                                                            <div className={`absolute top-2 left-2 w-2 h-2 rounded-full ${slide.isActive ? 'bg-emerald-500' : 'bg-gray-300'} shadow-sm`}></div>
                                                        </div>

                                                        <div className="flex-1 min-w-0 pl-2">
                                                            <h3 className="text-lg font-bold text-gray-800 truncate">{slide.title}</h3>
                                                            <p className="text-sm text-gray-400 line-clamp-1 italic">"{slide.subtitle}"</p>
                                                        </div>

                                                        <div className="flex items-center gap-2 pr-4">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); toggleStatus(slide); }}
                                                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${slide.isActive ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                                                                title={slide.isActive ? "ปิด" : "เปิด"}
                                                            >
                                                                <Edit size={18} />
                                                            </button>
                                                            <Link
                                                                href={`/admin/hero-slides/edit/${slide.documentId}?site=${siteParam}`}
                                                                className="w-10 h-10 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center hover:bg-gray-100 transition-colors"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <ExternalLink size={18} />
                                                            </Link>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDelete(slide.documentId); }}
                                                                className="w-10 h-10 rounded-xl bg-neutral-50 text-neutral-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                                                                title="ลบ"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    ) : null}
                </div>
            ) : (
                <div className="text-center py-24 bg-white rounded-[3rem] border border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                        <Columns size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-400">ยังไม่มีสไลด์หน้าแรก</h3>
                    <p className="text-gray-300 mt-2 mb-8">เริ่มสร้างสไลด์แรกเพื่อเพิ่มความน่าสนใจให้กับหน้าเว็บไซต์</p>
                    <Link
                        href={`/admin/hero-slides/new?site=${siteParam}`}
                        className="inline-flex px-8 py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-accent transition-all"
                    >
                        + สร้างสไลด์แรก
                    </Link>
                </div>
            )}
        </div>
    );
}
