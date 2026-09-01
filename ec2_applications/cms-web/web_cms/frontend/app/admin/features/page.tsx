"use client";

import Swal from "sweetalert2";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { Save, Loader2, Plus, Trash2, Edit2, X, Move, LayoutGrid, Columns, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export default function AdminFeaturesPage() {
    const searchParams = useSearchParams();
    const siteParam = searchParams.get("site") || "main";
    const domain = siteParam === "pdpa" ? "pdpa.localhost" : "localhost";

    const [features, setFeatures] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFeature, setEditingFeature] = useState<any | null>(null);
    const [hasOrderChanged, setHasOrderChanged] = useState(false);

    const initialForm = {
        title: "",
        description: "",
        icon: "Shield", // default
        link: "",
        order: 0,
        section: siteParam === "pdpa" ? "PDPA Principles" : "Main Highlights",
        domain: domain
    };

    const [formData, setFormData] = useState(initialForm);

    const fetchFeatures = async () => {
        setLoading(true);
        try {
            const res = await fetchAPI("/features", {
                filters: { domain },
                sort: ["section:asc", "order:asc"]
            });
            setFeatures(res.data || []);
            setHasOrderChanged(false);
        } catch (error) {
            console.error("Error fetching features", error);
        } finally {
            setLoading(false);
        }
    };

    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        fetchFeatures();
    }, [domain]);

    const handleEdit = (feature: any) => {
        setEditingFeature(feature);
        setFormData({
            title: feature.title,
            description: feature.description,
            icon: feature.icon,
            link: feature.link || "",
            order: feature.order,
            section: feature.section,
            domain: feature.domain
        });
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingFeature(null);
        setFormData(initialForm);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("คุณต้องการลบรายการนี้ใช่หรือไม่?")) return;
        try {
            await fetchAPI(`/features/${id}`, {}, { method: "DELETE" });
            fetchFeatures();
        } catch (error) {
            console.error("Error deleting", error);
            Swal.fire({ icon: "error", title: "แจ้งเตือน", text: "ลบไม่สำเร็จ" });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingFeature) {
                await fetchAPI(`/features/${editingFeature.documentId}`, {}, {
                    method: "PUT",
                    body: JSON.stringify({ data: formData })
                });
            } else {
                await fetchAPI("/features", {}, {
                    method: "POST",
                    body: JSON.stringify({ data: formData })
                });
            }
            setIsModalOpen(false);
            fetchFeatures();
        } catch (error) {
            console.error("Error saving", error);
            Swal.fire({ icon: "error", title: "แจ้งเตือน", text: "บันทึกไม่สำเร็จ" });
        }
    };

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) {
            return;
        }

        const newOrder = Array.from(features);
        const [reorderedItem] = newOrder.splice(result.source.index, 1);
        newOrder.splice(result.destination.index, 0, reorderedItem);

        setFeatures(newOrder);
        setHasOrderChanged(true);
    };

    const saveNewOrder = async () => {
        setLoading(true);
        try {
            await Promise.all(features.map((feature, index) =>
                fetchAPI(`/features/${feature.documentId}`, {}, {
                    method: "PUT",
                    body: JSON.stringify({ data: { order: index + 1 } })
                })
            ));
            setHasOrderChanged(false);
            Swal.fire({ icon: "success", title: "สำเร็จ", text: "บันทึกลำดับเรียบร้อยแล้ว", timer: 1500, showConfirmButton: false });
            fetchFeatures();
        } catch (err) {
            console.error("Failed to save order", err);
            Swal.fire({ icon: "error", title: "แจ้งเตือน", text: "เกิดข้อผิดพลาดในการบันทึกลำดับ" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-20">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black font-heading text-primary mb-2">จัดการจุดเด่น/หลักการ</h1>
                    <p className="text-gray-500">จัดการข้อมูล Features ที่แสดงหน้าแรก</p>
                </div>
                <div className="flex gap-4">
                    {hasOrderChanged && (
                        <button
                            onClick={saveNewOrder}
                            className="px-6 py-3 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95" style={{ background: "var(--accent-color)" }}
                        >
                            <Columns size={18} /> บันทึกลำดับใหม่
                        </button>
                    )}
                    <button
                        onClick={handleCreate}
                        className="px-6 py-3 bg-primary text-white font-bold rounded-2xl shadow-premium hover:bg-accent transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Plus size={20} /> เพิ่มรายการใหม่
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" size={40} /></div>
            ) : (
                <div className="space-y-4">
                    {features.length > 0 && (
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-4 flex items-center gap-2 mb-2">
                            <Columns size={14} /> สามารถลากเพื่อจัดลำดับได้ (Drag to Reorder)
                        </p>
                    )}
                    {features.length > 0 && isMounted && (
                        <DragDropContext onDragEnd={handleDragEnd}>
                            <Droppable droppableId="features">
                                {(provided) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                                    >
                                        {features.map((feature, index) => (
                                            <Draggable key={feature.id.toString()} draggableId={feature.id.toString()} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className={`bg-white p-6 rounded-[2rem] border border-gray-100 transition-all group relative cursor-grab active:cursor-grabbing ${snapshot.isDragging ? "shadow-2xl scale-[1.02] ring-2 ring-primary/20 z-50" : "shadow-sm hover:shadow-md"
                                                            }`}
                                                    >
                                                        <span className="absolute top-4 right-4 text-[10px] font-bold bg-gray-100 px-2 py-1 rounded-lg text-gray-500 uppercase tracking-widest">
                                                            {feature.section}
                                                        </span>
                                                        <div className="flex items-center gap-3 mb-4">
                                                            <div
                                                                {...provided.dragHandleProps}
                                                                className="p-1 rounded-md text-gray-300 hover:text-primary hover:bg-gray-50 transition-colors"
                                                            >
                                                                <GripVertical size={16} />
                                                            </div>
                                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "var(--accent-subtle)", color: "var(--accent-color)" }}>
                                                                <LayoutGrid size={24} />
                                                            </div>
                                                        </div>
                                                        <h3 className="text-lg font-bold font-heading text-gray-800 mb-2 truncate">{feature.title}</h3>
                                                        <p className="text-gray-500 text-sm mb-4 line-clamp-2 min-h-[40px]">{feature.description}</p>

                                                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                                            <div className="text-xs font-bold text-gray-400">Order: {feature.order}</div>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleEdit(feature); }}
                                                                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-primary transition-colors"
                                                                >
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDelete(feature.documentId); }}
                                                                    className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
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
                    )}
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-lg relative z-10"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black font-heading text-primary">
                                    {editingFeature ? "แก้ไขรายการ" : "เพิ่มรายการใหม่"}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-gray-700 block mb-1">หัวข้อ (Title)</label>
                                    <input
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                                        placeholder="เช่น Data Security..."
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-700 block mb-1">รายละเอียด (Description)</label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                                        placeholder="รายละเอียดสั้นๆ..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 block mb-1">Icon Name</label>
                                        <input
                                            value={formData.icon}
                                            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                                            placeholder="e.g. Shield, Lock"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">ใช้ชื่อไอคอนจาก Lucide React</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-gray-700 block mb-1">ลำดับ (Order)</label>
                                        <input
                                            type="number"
                                            value={formData.order}
                                            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-gray-700 block mb-1">Section</label>
                                    <select
                                        value={formData.section}
                                        onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                                    >
                                        <option value="Main Highlights">Main Highlights (DataGOV)</option>
                                        <option value="PDPA Principles">PDPA Principles</option>
                                        <option value="PDPA Stats">PDPA Stats</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-premium hover:bg-accent transition-all active:scale-95 mt-4"
                                >
                                    บันทึกข้อมูล
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
