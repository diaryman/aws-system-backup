"use client";

import Swal from "sweetalert2";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { fetchAPI, getStrapiMedia } from "@/lib/api";
import { Plus, Edit, Trash2, Loader2, ShieldCheck, Lock, CheckCircle, FileCheck, X, Columns, GripVertical, Upload, FileText, ExternalLink } from "lucide-react";
import dynamic from "next/dynamic";
import { Reorder } from "motion/react";
import { uploadFile } from "@/app/actions/upload";

const RichTextEditor = dynamic(() => import("@/components/RichTextEditor"), {
    ssr: false,
    loading: () => <div className="h-[300px] bg-gray-50 rounded-xl animate-pulse" />
});

export default function PoliciesPage() {
    const searchParams = useSearchParams();
    const siteParam = searchParams.get("site") || "main";
    const domain = siteParam === "pdpa" ? "pdpa.localhost" : "localhost";

    const [policies, setPolicies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasOrderChanged, setHasOrderChanged] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [docFile, setDocFile] = useState<File | null>(null);
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [existingFile, setExistingFile] = useState<any>(null);
    const [existingCoverImage, setExistingCoverImage] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        icon: "ShieldCheck",
        category: "standard",
        domain: domain,
        order: 0,
        isActive: true,
        highlightValue: ""
    });

    const iconOptions = ["ShieldCheck", "Lock", "CheckCircle", "FileCheck", "Award", "Shield"];
    const categoryLabels: any = {
        "standard": "มาตรฐาน",
        "compliance": "การปฏิบัติตาม",
        "certification": "การรับรอง",
        "security": "ความปลอดภัย"
    };

    useEffect(() => {
        loadPolicies();
    }, [domain]);

    const loadPolicies = async () => {
        try {
            const res = await fetchAPI("/policies", {
                filters: { domain },
                sort: ["order:asc"],
                populate: ["file", "coverImage"],
                pagination: { pageSize: 100 }
            });
            setPolicies(res.data || []);
            setHasOrderChanged(false);
        } catch (error) {
            console.error("Error loading policies", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            let uploadedFileId = undefined;
            if (docFile) {
                const fData = new FormData();
                fData.append("files", docFile);
                const ups = await uploadFile(fData);
                if (ups && ups.length > 0) uploadedFileId = ups[0].id;
            }

            let uploadedCoverId = undefined;
            if (coverImageFile) {
                const cData = new FormData();
                cData.append("files", coverImageFile);
                const cUps = await uploadFile(cData);
                if (cUps && cUps.length > 0) uploadedCoverId = cUps[0].id;
            }

            const payload: any = { ...formData };
            if (uploadedFileId) payload.file = uploadedFileId;
            if (uploadedCoverId) payload.coverImage = uploadedCoverId;

            if (editing) {
                await fetchAPI(`/policies/${editing.documentId}`, {}, {
                    method: "PUT",
                    body: JSON.stringify({ data: payload })
                });
                Swal.fire({ icon: "success", title: "สำเร็จ", text: "อัปเดตนโยบายเรียบร้อย", timer: 1500, showConfirmButton: false });
            } else {
                await fetchAPI("/policies", {}, {
                    method: "POST",
                    body: JSON.stringify({ data: payload })
                });
                Swal.fire({ icon: "success", title: "สำเร็จ", text: "สร้างนโยบายเรียบร้อย", timer: 1500, showConfirmButton: false });
            }
            setShowModal(false);
            resetForm();
            loadPolicies();
        } catch (error) {
            console.error("Error saving policy", error);
            Swal.fire({ icon: "error", title: "แจ้งเตือน", text: "บันทึกไม่สำเร็จ" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (documentId: string) => {
        if (!confirm("ต้องการลบนโยบายนี้?")) return;
        try {
            await fetchAPI(`/policies/${documentId}`, {}, { method: "DELETE" });
            Swal.fire({ icon: "success", title: "สำเร็จ", text: "ลบเรียบร้อย", timer: 1500, showConfirmButton: false });
            loadPolicies();
        } catch (error) {
            console.error("Error deleting policy", error);
            Swal.fire({ icon: "error", title: "แจ้งเตือน", text: "ลบไม่สำเร็จ" });
        }
    };

    const openEditModal = (policy: any) => {
        setEditing(policy);
        setFormData({
            title: policy.title,
            description: policy.description || "",
            icon: policy.icon || "ShieldCheck",
            category: policy.category || "standard",
            domain: policy.domain,
            order: policy.order || 0,
            isActive: policy.isActive !== false,
            highlightValue: policy.highlightValue || ""
        });
        setExistingFile(policy.file);
        setExistingCoverImage(policy.coverImage);
        setDocFile(null);
        setCoverImageFile(null);
        setShowModal(true);
    };

    const handleReorder = (newOrder: any[]) => {
        setPolicies(newOrder);
        setHasOrderChanged(true);
    };

    const saveNewOrder = async () => {
        setLoading(true);
        try {
            await Promise.all(policies.map((policy, index) =>
                fetchAPI(`/policies/${policy.documentId}`, {}, {
                    method: "PUT",
                    body: JSON.stringify({ data: { order: index + 1 } })
                })
            ));
            setHasOrderChanged(false);
            Swal.fire({ icon: "success", title: "สำเร็จ", text: "บันทึกลำดับเรียบร้อยแล้ว", timer: 1500, showConfirmButton: false });
            loadPolicies();
        } catch (err) {
            console.error("Failed to save order", err);
            Swal.fire({ icon: "error", title: "แจ้งเตือน", text: "เกิดข้อผิดพลาดในการบันทึกลำดับ" });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEditing(null);
        setDocFile(null);
        setCoverImageFile(null);
        setExistingFile(null);
        setExistingCoverImage(null);
        setFormData({
            title: "",
            description: "",
            icon: "ShieldCheck",
            category: "standard",
            domain: domain,
            order: 0,
            isActive: true,
            highlightValue: ""
        });
    };

    const IconComponent = ({ name }: { name: string }) => {
        const icons: any = { ShieldCheck, Lock, CheckCircle, FileCheck };
        const Icon = icons[name] || ShieldCheck;
        return <Icon size={20} />;
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-6xl mx-auto pb-20">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black font-heading text-primary">นโยบายและมาตรฐาน</h1>
                    <p className="text-gray-400 font-medium mt-2">จัดการมาตรฐานและนโยบายการปฏิบัติสำหรับ {siteParam === "pdpa" ? "PDPA Center" : "DataGOV"}</p>
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
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-premium hover:bg-accent transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Plus size={20} />
                        เพิ่มนโยบาย
                    </button>
                </div>
            </div>

            {/* Policies Grid */}
            <div className="space-y-4">
                {policies.length > 0 && (
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-4 flex items-center gap-2 mb-2">
                        <Columns size={14} /> สามารถลากเพื่อจัดลำดับได้ (Drag to Reorder)
                    </p>
                )}
                <Reorder.Group axis="y" values={policies} onReorder={handleReorder} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {policies.map((policy) => (
                        <Reorder.Item
                            key={policy.id}
                            value={policy}
                            className="bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-lg transition-all cursor-grab active:cursor-grabbing"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <GripVertical className="text-gray-300" size={16} />
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-subtle)", color: "var(--accent-color)" }}>
                                        <IconComponent name={policy.icon} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{policy.title}</h3>
                                        <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: "var(--accent-subtle)", color: "var(--accent-color)" }}>
                                            {categoryLabels[policy.category] || policy.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openEditModal(policy); }}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <Edit size={16} className="text-gray-600" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(policy.documentId); }}
                                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} className="text-red-500" />
                                    </button>
                                </div>
                            </div>
                            {policy.highlightValue && (
                                <div className="text-2xl font-black mb-2" style={{ color: "var(--accent-color)" }}>{policy.highlightValue}</div>
                            )}
                            <div className="text-sm text-gray-500 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: policy.description || '' }} />
                        </Reorder.Item>
                    ))}
                </Reorder.Group>
            </div>

            {policies.length === 0 && (
                <div className="text-center py-16">
                    <p className="text-gray-400 font-medium">ยังไม่มีนโยบาย คลิก "เพิ่มนโยบาย" เพื่อเริ่มต้น</p>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowModal(false); resetForm(); }}>
                    <div className="bg-white rounded-3xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black">{editing ? "แก้ไขนโยบาย" : "เพิ่มนโยบายใหม่"}</h2>
                            <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* File Upload Area */}
                            <div className="space-y-4 mb-6">
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <FileText size={16} className="text-primary" /> เลือกไฟล์เอกสารนโยบาย/มาตรฐาน (PDF)
                                </label>
                                {existingFile && !docFile && (
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-slate-700 truncate max-w-xs">{existingFile.name}</p>
                                                <p className="text-[10px] text-slate-400">ขนาด: {(existingFile.size / 1024).toFixed(2)} KB</p>
                                            </div>
                                        </div>
                                        <a href={getStrapiMedia(existingFile.url) || undefined} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-500 hover:text-primary transition-colors">
                                            เปิดดูไฟล์ <ExternalLink size={12} />
                                        </a>
                                    </div>
                                )}
                                <div className={`relative border-2 border-dashed rounded-2xl p-6 transition-all flex flex-col items-center justify-center ${docFile ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 hover:border-primary/40 bg-gray-50'}`}>
                                    {docFile ? (
                                        <div className="flex items-center gap-4 pointer-events-none w-full">
                                            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white"><FileText size={20} /></div>
                                            <div className="flex-1"><p className="font-bold text-emerald-900 truncate max-w-xs">{docFile.name}</p><p className="text-xs text-emerald-600">{(docFile.size / 1024 / 1024).toFixed(2)} MB</p></div>
                                            <button type="button" onClick={() => setDocFile(null)} className="p-2 hover:bg-emerald-100 rounded-full text-emerald-600 transition-colors relative z-10 pointer-events-auto"><X size={16} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center pointer-events-none">
                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400 mb-3"><Upload size={20} /></div>
                                            <p className="text-sm font-bold text-gray-500">คลิกหรือลากไฟล์เอกสาร (PDF) มาวาง</p>
                                        </div>
                                    )}
                                    <input type="file" accept=".pdf" onChange={(e) => { if (e.target.files && e.target.files[0]) setDocFile(e.target.files[0]) }} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>
                            </div>

                            {/* Cover Image Upload Area */}
                            <div className="space-y-4 mb-6">
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                    <Upload size={16} className="text-primary" /> เลือกรูปภาพหน้าปกเอกสาร (แนวตั้ง)
                                </label>
                                {existingCoverImage && !coverImageFile && (
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-20 bg-gray-200 rounded-xl overflow-hidden shadow-sm">
                                                <img src={getStrapiMedia(existingCoverImage.url) || ""} alt="Cover" className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-slate-700 truncate max-w-xs">{existingCoverImage.name}</p>
                                                <p className="text-[10px] text-slate-400">ขนาด: {(existingCoverImage.size / 1024).toFixed(2)} KB</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className={`relative border-2 border-dashed rounded-2xl p-6 transition-all flex flex-col items-center justify-center ${coverImageFile ? 'border-primary/50 bg-primary/5' : 'border-gray-200 hover:border-primary/40 bg-gray-50'}`}>
                                    {coverImageFile ? (
                                        <div className="flex items-center gap-4 pointer-events-none w-full">
                                            <div className="w-14 h-20 bg-gray-200 rounded-xl overflow-hidden shadow-sm"><img src={URL.createObjectURL(coverImageFile)} alt="Cover preview" className="w-full h-full object-cover" /></div>
                                            <div className="flex-1"><p className="font-bold text-gray-800 truncate max-w-xs">{coverImageFile.name}</p><p className="text-xs text-gray-500">{(coverImageFile.size / 1024 / 1024).toFixed(2)} MB</p></div>
                                            <button type="button" onClick={() => setCoverImageFile(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-600 transition-colors relative z-10 pointer-events-auto"><X size={16} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center pointer-events-none">
                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400 mb-3"><Upload size={20} /></div>
                                            <p className="text-sm font-bold text-gray-500">คลิกหรือลากรูปหน้าปก (JPG, PNG) มาวาง</p>
                                        </div>
                                    )}
                                    <input type="file" accept="image/*" onChange={(e) => { if (e.target.files && e.target.files[0]) setCoverImageFile(e.target.files[0]) }} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-2">ชื่อนโยบาย/มาตรฐาน</label>
                                <input
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                                    placeholder="เช่น ISO/IEC 27001"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-2">คำอธิบาย</label>
                                <RichTextEditor
                                    value={formData.description || ""}
                                    onChange={(value) => setFormData({ ...formData, description: value })}
                                    placeholder="รายละเอียดเกี่ยวกับนโยบายหรือมาตรฐาน..."
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
                                        <option value="standard">มาตรฐาน</option>
                                        <option value="compliance">การปฏิบัติตาม</option>
                                        <option value="certification">การรับรอง</option>
                                        <option value="security">ความปลอดภัย</option>
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
                                <label className="block text-sm font-bold mb-2">ค่าไฮไลท์ (เช่น 99.9%)</label>
                                <input
                                    value={formData.highlightValue}
                                    onChange={(e) => setFormData({ ...formData, highlightValue: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                                    placeholder="99.9% หรือ A+"
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
                                    disabled={isSaving}
                                    className="flex-1 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-accent transition-all flex justify-center items-center gap-2"
                                >
                                    {isSaving && <Loader2 className="animate-spin" size={18} />} บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
