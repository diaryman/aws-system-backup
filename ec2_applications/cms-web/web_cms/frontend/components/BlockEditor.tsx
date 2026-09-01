"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical, Type, Images, X, FolderSearch, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { motion, Reorder, AnimatePresence } from "framer-motion";
import { fetchAPI, getStrapiMedia } from "@/lib/api";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), {
    ssr: false,
    loading: () => <div className="h-[200px] bg-gray-50 rounded-xl animate-pulse" />
});

interface BlockEditorProps {
    blocks: any[];
    onChange: (blocks: any[]) => void;
}

export default function BlockEditor({ blocks, onChange }: BlockEditorProps) {
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [galleries, setGalleries] = useState<any[]>([]);
    const [isGalleryLoading, setIsGalleryLoading] = useState(false);
    const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);

    const openGalleryModal = async (index: number) => {
        setActiveBlockIndex(index);
        setIsGalleryOpen(true);
        setIsGalleryLoading(true);
        try {
            const res = await fetchAPI("/galleries", { populate: ["images"] });
            setGalleries(res.data || []);
        } catch (error) {
            console.error("Failed to load galleries", error);
        } finally {
            setIsGalleryLoading(false);
        }
    };

    const handleSelectGallery = (images: any[]) => {
        if (activeBlockIndex !== null) {
            updateBlock(activeBlockIndex, { images });
        }
        setIsGalleryOpen(false);
    };

    const addBlock = (type: string) => {
        const newBlock = type === "shared.rich-text"
            ? { __component: "shared.rich-text", body: "" }
            : { __component: "shared.gallery", images: [], layout: "grid" };

        onChange([...blocks, newBlock]);
        setShowAddMenu(false);
    };

    const updateBlock = (index: number, data: any) => {
        const newBlocks = [...blocks];
        newBlocks[index] = { ...newBlocks[index], ...data };
        onChange(newBlocks);
    };

    const removeBlock = (index: number) => {
        const newBlocks = blocks.filter((_, i) => i !== index);
        onChange(newBlocks);
    };

    return (
        <div className="space-y-8">
            <Reorder.Group axis="y" values={blocks} onReorder={onChange} className="space-y-6">
                {blocks.map((block, index) => (
                    <Reorder.Item
                        key={index}
                        value={block}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="relative group"
                    >
                        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            {/* Block Header */}
                            <div className="px-6 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="cursor-grab active:cursor-grabbing text-gray-400 p-1 hover:text-primary transition-colors">
                                        <GripVertical size={18} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                        {block.__component === "shared.rich-text" ? "ข้อความตัวอักษร" : "แกลเลอรี่รูปภาพ"}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeBlock(index)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            {/* Block Content */}
                            <div className="p-6">
                                {block.__component === "shared.rich-text" ? (
                                    <RichTextEditor
                                        value={block.body || ""}
                                        onChange={(val) => updateBlock(index, { body: val })}
                                        placeholder="เริ่มเขียนเนื้อหาข่าวส่วนนี้..."
                                    />
                                ) : (
                                    <div className="p-8 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/30 flex flex-col items-center justify-center gap-4">
                                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-blue-500">
                                            {block.images && block.images.length > 0 ? (
                                                <div className="grid grid-cols-2 gap-1 p-1">
                                                    {block.images.slice(0, 4).map((img: any, i: number) => (
                                                        <div key={i} className="w-5 h-5 bg-gray-100 rounded-sm overflow-hidden text-[0px]">
                                                            <img src={getStrapiMedia(img.url) || ""} className="w-full h-full object-cover" />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <Images size={32} />
                                            )}
                                        </div>
                                        <div className="text-center">
                                            <p className="font-bold text-gray-700">
                                                {block.images && block.images.length > 0
                                                    ? `เลือกแล้ว ${block.images.length} รูปภาพ`
                                                    : "ฟีเจอร์แกลเลอรี่แบบใหม่"}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {block.images && block.images.length > 0
                                                    ? "รูปภาพเหล่านี้จะถูกจัดเรียงตามเลย์เอาต์ที่เลือก"
                                                    : "คลิกปุ่มด้านล่างเพื่อเลือกแกลเลอรี่"}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap justify-center gap-3 mt-2">
                                            <button
                                                type="button"
                                                onClick={() => openGalleryModal(index)}
                                                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm"
                                            >
                                                <Images size={14} /> เลือกอัลบั้มแกลเลอรี่
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateBlock(index, { layout: block.layout === "grid" ? "slider" : "grid" })}
                                                className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all shadow-sm"
                                            >
                                                {block.layout === "grid" ? "สลับเป็นสไลเดอร์" : "สลับเป็น 3 คอลัมน์"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Reorder.Item>
                ))}
            </Reorder.Group>

            {/* Add Block Menu */}
            {/* Same location as before, but wrapped for clarity if needed */}

            {/* Gallery Selection Modal */}
            <AnimatePresence>
                {isGalleryOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsGalleryOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-4xl max-h-[80vh] rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col"
                        >
                            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-primary font-heading">เลือกอัลบั้มรูปภาพ</h3>
                                    <p className="text-xs text-gray-400 font-medium">รูปทั้งหมดในแกลเลอรี่นี้จะถูกนำไปแสดงผลในข่าว</p>
                                </div>
                                <button type="button" onClick={() => setIsGalleryOpen(false)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {isGalleryLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <Loader2 className="animate-spin text-primary" size={40} />
                                        <p className="text-sm font-bold text-gray-400">กำลังโหลดแกลเลอรี่...</p>
                                    </div>
                                ) : galleries.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {galleries.map(gallery => (
                                            <div
                                                key={gallery.id}
                                                onClick={() => handleSelectGallery(gallery.images)}
                                                className="group cursor-pointer bg-gray-50 rounded-3xl border border-gray-100 p-4 hover:border-primary hover:bg-white hover:shadow-xl transition-all duration-500"
                                            >
                                                <div className="aspect-[16/6] rounded-2xl overflow-hidden mb-4 bg-gray-200">
                                                    {gallery.images?.[0] && (
                                                        <img src={getStrapiMedia(gallery.images[0].url) || ""} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                                                    )}
                                                </div>
                                                <h4 className="font-bold text-primary group-hover:text-accent transition-colors">{gallery.title}</h4>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">จำนวน {gallery.images?.length || 0} รูปภาพ</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-20 flex flex-col items-center">
                                        <FolderSearch size={48} className="text-gray-200 mb-4" />
                                        <p className="text-gray-400 font-bold">ไม่พบแกลเลอรี่ในระบบ</p>
                                        <button
                                            type="button"
                                            onClick={() => window.open('/admin/gallery', '_blank')}
                                            className="mt-4 text-xs font-bold text-blue-500 hover:underline"
                                        >
                                            ไปหน้าจัดการแกลเลอรี่เพื่อสร้างใหม่
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setShowAddMenu(!showAddMenu)}
                    className="w-full py-4 border-2 border-dashed border-gray-200 rounded-[2rem] flex items-center justify-center gap-2 text-gray-400 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all group font-bold"
                >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                    เพิ่มส่วนประกอบใหม่ (Add Block)
                </button>

                {showAddMenu && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="absolute bottom-full left-0 right-0 mb-4 bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 grid grid-cols-2 gap-4 z-20"
                    >
                        <button
                            type="button"
                            onClick={() => addBlock("shared.rich-text")}
                            className="flex flex-col items-center gap-3 p-6 rounded-2xl hover:bg-blue-50 transition-all group"
                        >
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                <Type size={24} />
                            </div>
                            <span className="text-sm font-bold text-gray-700">ข้อความตัวอักษร</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => addBlock("shared.gallery")}
                            className="flex flex-col items-center gap-3 p-6 rounded-2xl hover:bg-purple-50 transition-all group"
                        >
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                                <Images size={24} />
                            </div>
                            <span className="text-sm font-bold text-gray-700">แกลเลอรี่รูปภาพ</span>
                        </button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
