"use client";

import Swal from "sweetalert2";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { fetchAPI } from "@/lib/api";
import { Plus, Edit, Trash2, Loader2, GripVertical, Download, Wrench, Package, X, Columns } from "lucide-react";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export default function ServicesPage() {
    const searchParams = useSearchParams();
    const siteParam = searchParams.get("site") || "main";
    const domain = siteParam === "pdpa" ? "pdpa.localhost" : "localhost";

    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasOrderChanged, setHasOrderChanged] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        icon: "Download",
        link: "",
        category: "service",
        domain: domain,
        order: 0,
        isActive: true
    });

    const iconOptions = ["Download", "Wrench", "Package", "Shield", "Database", "FileText", "Settings"];
    const categoryLabels: any = {
        "download": "ดาวน์โหลด",
        "service": "บริการ",
        "tool": "เครื่องมือ"
    };

    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        loadServices();
    }, [domain]);

    const loadServices = async () => {
        try {
            const res = await fetchAPI("/services", {
                filters: { domain },
                sort: ["order:asc"],
                pagination: { pageSize: 100 }
            });
            setServices(res.data || []);
            setHasOrderChanged(false);
        } catch (error) {
            console.error("Error loading services", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editing) {
                await fetchAPI(`/services/${editing.id}`, {}, {
                    method: "PUT",
                    body: JSON.stringify({ data: formData })
                });
                Swal.fire({ icon: "success", title: "สำเร็จ", text: "อัปเดตบริการเรียบร้อย", timer: 1500, showConfirmButton: false });
            } else {
                await fetchAPI("/services", {}, {
                    method: "POST",
                    body: JSON.stringify({ data: formData })
                });
                Swal.fire({ icon: "success", title: "สำเร็จ", text: "สร้างบริการเรียบร้อย", timer: 1500, showConfirmButton: false });
            }
            setShowModal(false);
            resetForm();
            loadServices();
        } catch (error) {
            console.error("Error saving service", error);
            Swal.fire({ icon: "error", title: "แจ้งเตือน", text: "บันทึกไม่สำเร็จ" });
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("ต้องการลบบริการนี้?")) return;
        try {
            await fetchAPI(`/services/${id}`, {}, { method: "DELETE" });
            Swal.fire({ icon: "success", title: "สำเร็จ", text: "ลบเรียบร้อย", timer: 1500, showConfirmButton: false });
            loadServices();
        } catch (error) {
            console.error("Error deleting service", error);
            Swal.fire({ icon: "error", title: "แจ้งเตือน", text: "ลบไม่สำเร็จ" });
        }
    };

    const openEditModal = (service: any) => {
        setEditing(service);
        setFormData({
            title: service.title,
            description: service.description || "",
            icon: service.icon || "Download",
            link: service.link || "",
            category: service.category || "service",
            domain: service.domain,
            order: service.order || 0,
            isActive: service.isActive !== false
        });
        setShowModal(true);
    };

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) {
            return;
        }

        const newOrder = Array.from(services);
        const [reorderedItem] = newOrder.splice(result.source.index, 1);
        newOrder.splice(result.destination.index, 0, reorderedItem);

        setServices(newOrder);
        setHasOrderChanged(true);
    };

    const saveNewOrder = async () => {
        setLoading(true);
        try {
            await Promise.all(services.map((service, index) =>
                fetchAPI(`/services/${service.documentId}`, {}, {
                    method: "PUT",
                    body: JSON.stringify({ data: { order: index + 1 } })
                })
            ));
            setHasOrderChanged(false);
            Swal.fire({ icon: "success", title: "สำเร็จ", text: "บันทึกลำดับเรียบร้อยแล้ว", timer: 1500, showConfirmButton: false });
            loadServices();
        } catch (err) {
            console.error("Failed to save order", err);
            Swal.fire({ icon: "error", title: "แจ้งเตือน", text: "เกิดข้อผิดพลาดในการบันทึกลำดับ" });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEditing(null);
        setFormData({
            title: "",
            description: "",
            icon: "Download",
            link: "",
            category: "service",
            domain: domain,
            order: 0,
            isActive: true
        });
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-6xl mx-auto pb-20">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black font-heading text-primary">บริการและดาวน์โหลด</h1>
                    <p className="text-gray-400 font-medium mt-2">จัดการรายการบริการและเอกสารดาวน์โหลดสำหรับ {siteParam === "pdpa" ? "PDPA Center" : "DataGOV"}</p>
                </div>
                <div className="flex gap-4">
                    {hasOrderChanged && (
                        <button
                            onClick={saveNewOrder}
                            className="px-6 py-3 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
                            style={{ background: 'var(--accent-color)' }}
                        >
                            <Columns size={18} /> บันทึกลำดับใหม่
                        </button>
                    )}
                    <button
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-premium hover:bg-accent transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Plus size={20} />
                        เพิ่มบริการ
                    </button>
                </div>
            </div>

            {/* Services Grid */}
            <div className="space-y-4">
                {services.length > 0 && (
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-4 flex items-center gap-2 mb-2">
                        <Columns size={14} /> สามารถลาก (Drag and Drop) เพื่อจัดลำดับได้
                    </p>
                )}

                {isMounted && services.length > 0 ? (
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="services">
                            {(provided) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                                >
                                    {services.map((service, index) => (
                                        <Draggable key={service.id.toString()} draggableId={service.id.toString()} index={index}>
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    className={`bg-white p-6 rounded-2xl border border-gray-100 transition-all ${snapshot.isDragging ? "shadow-2xl scale-[1.02] ring-2 ring-primary/20 z-50 cursor-grabbing" : "hover:shadow-lg"
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                {...provided.dragHandleProps}
                                                                className="p-1 rounded-md text-gray-300 hover:text-primary hover:bg-gray-50 transition-colors cursor-grab active:cursor-grabbing"
                                                            >
                                                                <GripVertical size={16} />
                                                            </div>
                                                            <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-color)' }}>
                                                                {categoryLabels[service.category] || service.category}
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); openEditModal(service); }}
                                                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                            >
                                                                <Edit size={16} className="text-gray-600" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDelete(service.id); }}
                                                                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 size={16} className="text-red-500" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <h3 className="font-bold text-lg mb-2">{service.title}</h3>
                                                    <p className="text-sm text-gray-500 line-clamp-2">{service.description}</p>
                                                    {service.link && (
                                                        <a href={service.link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-accent hover:underline mt-2 block truncate">
                                                            {service.link}
                                                        </a>
                                                    )}
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

            {services.length === 0 && (
                <div className="text-center py-16">
                    <p className="text-gray-400 font-medium">ยังไม่มีบริการ คลิก "เพิ่มบริการ" เพื่อเริ่มต้น</p>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowModal(false); resetForm(); }}>
                    <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black">{editing ? "แก้ไขบริการ" : "เพิ่มบริการใหม่"}</h2>
                            <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-2">ชื่อบริการ</label>
                                <input
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2">คำอธิบาย</label>
                                <textarea
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-2">หมวดหมู่</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                                    >
                                        <option value="service">บริการ</option>
                                        <option value="download">ดาวน์โหลด</option>
                                        <option value="tool">เครื่องมือ</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">ไอคอน</label>
                                    <select
                                        value={formData.icon}
                                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                                    >
                                        {iconOptions.map(icon => (
                                            <option key={icon} value={icon}>{icon}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2">ลิงก์ (URL)</label>
                                <input
                                    type="url"
                                    value={formData.link}
                                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                                    placeholder="https://..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2">ลำดับการแสดงผล</label>
                                <input
                                    type="number"
                                    value={formData.order}
                                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); resetForm(); }}
                                    className="px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-accent transition-all"
                                >
                                    บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
