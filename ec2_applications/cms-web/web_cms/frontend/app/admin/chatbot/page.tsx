"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect, useRef } from "react";
import {
    MessageSquare, Save, Bot, Cpu, Key, Terminal, Wifi, Shield,
    RefreshCcw, Info, Send, Plus, X, Sparkles, Eye, EyeOff, Zap,
    FileText, Upload, Trash2, ChevronDown, ChevronRight, Database,
    Settings2, Palette, BookOpen, AlertTriangle, Check, Loader2,
    ToggleLeft, ToggleRight, Globe, List, Type, Brain
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PROMPT_TEMPLATES } from "@/lib/rag";

export default function AdminChatbotPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ChatbotSettingsContent />
        </Suspense>
    );
}

// ==========================================
// TAB COMPONENT
// ==========================================
function TabButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all ${active
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "text-gray-400 hover:text-primary hover:bg-gray-50"
                }`}
        >
            {icon}
            {label}
        </button>
    );
}

// ==========================================
// MAIN CONTENT
// ==========================================
function ChatbotSettingsContent() {
    const searchParams = useSearchParams();
    const siteParam = searchParams.get("site") || "main";
    const siteName = siteParam === "pdpa" ? "PDPA Center" : "DataGOV";
    const domain = siteParam === "pdpa" ? "pdpa.localhost" : "localhost";

    const [activeTab, setActiveTab] = useState<"connection" | "personality" | "knowledge" | "advanced">("connection");

    const [config, setConfig] = useState<any>({
        isEnabled: true,
        provider: "gemini",
        apiKey: "",
        modelName: "gemini-1.5-flash",
        botName: "AI Assistant",
        systemPrompt: siteParam === "pdpa"
            ? "คุณคือผู้ช่วยผู้เชี่ยวชาญด้านกฎหมาย PDPA สำหรับศาลปกครอง ตอบคำถามเกี่ยวกับสิทธิ์ตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล อย่างสุภาพและถูกต้อง"
            : "คุณคือผู้ช่วยผู้เชี่ยวชาญด้านธรรมาภิบาลข้อมูล ตอบคำถามเกี่ยวกับมาตรฐาน นโยบาย และกฎระเบียบที่เกี่ยวข้องอย่างสุภาพและถูกต้อง",
        welcomeMessage: "สวัสดีครับ 👋 มีอะไรให้ผมช่วยไหมครับ?",
        suggestedQuestions: [],
        temperature: 0.7,
        // New advanced fields
        ragInstructions: "",
        fallbackMessage: "ขออภัยครับ ผมไม่มีข้อมูลเพียงพอสำหรับคำถามนี้ กรุณาติดต่อเจ้าหน้าที่โดยตรง",
        restrictedTopics: [],
        maxTokens: 1024,
        topP: 0.9,
        historyLength: 10,
        responseLanguage: "thai",
        responseFormat: "concise",
        showSources: true,
        promptTemplate: "custom",
        widgetPosition: "bottom-right",
        widgetColor: "",
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [newQuestion, setNewQuestion] = useState("");
    const [newRestriction, setNewRestriction] = useState("");

    // Knowledge Base state
    const [knowledgeDocs, setKnowledgeDocs] = useState<any[]>([]);
    const [knowledgeLoading, setKnowledgeLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Live test panel
    const [testMessages, setTestMessages] = useState<{ role: string; content: string }[]>([]);
    const [testInput, setTestInput] = useState("");
    const [testLoading, setTestLoading] = useState(false);
    const testEndRef = useRef<HTMLDivElement>(null);

    // Fetch config
    useEffect(() => {
        const fetchConfig = async () => {
            setLoading(true);
            try {
                const { fetchAPI } = await import("@/lib/api");
                const res = await fetchAPI("/chatbot-configs", { filters: { domain } });
                if (res.data && res.data.length > 0) {
                    const cfg = res.data[0];
                    setConfig({
                        ...config,
                        ...cfg,
                        suggestedQuestions: cfg.suggestedQuestions || [],
                        restrictedTopics: cfg.restrictedTopics || [],
                    });
                }
            } catch (err) {
                console.error("Failed to fetch chatbot config:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, [domain]);

    // Fetch knowledge docs
    useEffect(() => {
        fetchKnowledge();
    }, [domain]);

    const fetchKnowledge = async () => {
        setKnowledgeLoading(true);
        try {
            const { fetchAPI } = await import("@/lib/api");
            const res = await fetchAPI("/chatbot-knowledges", {
                filters: { domain },
                sort: ["createdAt:desc"],
                pagination: { limit: 50 },
            });
            setKnowledgeDocs(res.data || []);
        } catch (err) {
            console.error("Failed to fetch knowledge:", err);
        } finally {
            setKnowledgeLoading(false);
        }
    };

    useEffect(() => {
        testEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [testMessages]);

    const handleSave = async () => {
        setSaving(true);
        setStatusMsg(null);
        try {
            const { fetchAPI } = await import("@/lib/api");
            // Filter out Strapi internal/read-only fields
            const { id, documentId, createdAt, updatedAt, publishedAt, locale, ...savableConfig } = config;
            const payload = { data: { ...savableConfig, domain } };
            if (config.documentId) {
                await fetchAPI(`/chatbot-configs/${config.documentId}`, {}, { method: "PUT", body: JSON.stringify(payload) });
            } else {
                const created = await fetchAPI("/chatbot-configs", {}, { method: "POST", body: JSON.stringify(payload) });
                if (created.data) setConfig((prev: any) => ({ ...prev, documentId: created.data.documentId }));
            }
            setStatusMsg({ type: "success", text: "บันทึกการตั้งค่าแชทบอทเรียบร้อยแล้ว ✓" });
        } catch (err) {
            console.error("Save error:", err);
            setStatusMsg({ type: "error", text: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
        } finally {
            setSaving(false);
            setTimeout(() => setStatusMsg(null), 4000);
        }
    };

    const addSuggestedQuestion = () => {
        if (!newQuestion.trim()) return;
        setConfig((prev: any) => ({ ...prev, suggestedQuestions: [...(prev.suggestedQuestions || []), newQuestion.trim()] }));
        setNewQuestion("");
    };

    const removeSuggestedQuestion = (idx: number) => {
        setConfig((prev: any) => ({ ...prev, suggestedQuestions: prev.suggestedQuestions.filter((_: any, i: number) => i !== idx) }));
    };

    const addRestriction = () => {
        if (!newRestriction.trim()) return;
        setConfig((prev: any) => ({ ...prev, restrictedTopics: [...(prev.restrictedTopics || []), newRestriction.trim()] }));
        setNewRestriction("");
    };

    const removeRestriction = (idx: number) => {
        setConfig((prev: any) => ({ ...prev, restrictedTopics: prev.restrictedTopics.filter((_: any, i: number) => i !== idx) }));
    };

    // Handle prompt template change
    const handleTemplateChange = (templateKey: string) => {
        setConfig((prev: any) => ({
            ...prev,
            promptTemplate: templateKey,
            ...(templateKey !== "custom" ? { systemPrompt: PROMPT_TEMPLATES[templateKey]?.prompt || prev.systemPrompt } : {}),
        }));
    };

    // =====================================
    // KNOWLEDGE BASE: File Upload & Process
    // =====================================
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadProgress("กำลังอ่านไฟล์...");

        try {
            let textContent = "";
            const fileName = file.name;
            const fileType = file.name.split(".").pop()?.toLowerCase() || "";

            if (fileType === "txt" || fileType === "md" || fileType === "csv") {
                textContent = await file.text();
            } else if (fileType === "pdf") {
                // Use pdf.js to extract text on the client side
                setUploadProgress("กำลังดึงข้อความจาก PDF...");
                const pdfjsLib = await import("pdfjs-dist");
                pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

                const pages: string[] = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    setUploadProgress(`กำลังอ่านหน้า ${i}/${pdf.numPages}...`);
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items
                        .map((item: any) => item.str)
                        .join(" ");
                    pages.push(pageText);
                }
                textContent = pages.join("\n\n");
            } else {
                throw new Error(`ไม่รองรับไฟล์ประเภท .${fileType} (รองรับ: PDF, TXT, MD, CSV)`);
            }

            if (!textContent.trim()) {
                throw new Error("ไม่สามารถดึงข้อความจากไฟล์ได้ (ไฟล์อาจเป็นภาพสแกน)");
            }

            // Send to processing API
            setUploadProgress("กำลังประมวลผลข้อความ...");
            const processRes = await fetch("/api/knowledge/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: textContent,
                    title: fileName.replace(/\.\w+$/, ""),
                    domain,
                }),
            });

            const processResult = await processRes.json();
            if (!processResult.success) {
                throw new Error(processResult.error || "Processing failed");
            }

            setUploadProgress(`✅ สำเร็จ! ได้ ${processResult.chunkCount} chunks`);
            await fetchKnowledge();

            setTimeout(() => setUploadProgress(""), 3000);
        } catch (err: any) {
            setUploadProgress(`❌ ${err.message}`);
            setTimeout(() => setUploadProgress(""), 5000);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const toggleKnowledgeActive = async (docId: string, currentActive: boolean) => {
        try {
            const { fetchAPI } = await import("@/lib/api");
            await fetchAPI(`/chatbot-knowledges/${docId}`, {}, {
                method: "PUT",
                body: JSON.stringify({ data: { isActive: !currentActive } }),
            });
            await fetchKnowledge();
        } catch (err) {
            console.error("Toggle failed:", err);
        }
    };

    const deleteKnowledge = async (docId: string) => {
        if (!confirm("ต้องการลบเอกสารนี้ออกจากฐานความรู้?")) return;
        try {
            const { fetchAPI } = await import("@/lib/api");
            await fetchAPI(`/chatbot-knowledges/${docId}`, {}, { method: "DELETE" });
            await fetchKnowledge();
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    // Live Test
    const handleLiveTest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!testInput.trim() || testLoading) return;
        const msg = testInput.trim();
        setTestInput("");
        const updatedHistory = [...testMessages, { role: "user", content: msg }];
        setTestMessages([...updatedHistory, { role: "assistant", content: "" }]);
        setTestLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: msg, history: testMessages, domain }),
            });

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let accumulated = "";

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const lines = decoder.decode(value).split("\n");
                    for (const line of lines) {
                        if (line.startsWith("data: ")) {
                            const data = line.slice(6);
                            if (data === "[DONE]") break;
                            try {
                                const parsed = JSON.parse(data);
                                if (parsed.text) {
                                    accumulated += parsed.text;
                                    setTestMessages([...updatedHistory, { role: "assistant", content: accumulated }]);
                                }
                            } catch { }
                        }
                    }
                }
            }
        } catch {
            setTestMessages([...updatedHistory, { role: "assistant", content: "❌ เกิดข้อผิดพลาด กรุณาตั้งค่า API Key ก่อน" }]);
        } finally {
            setTestLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-primary font-heading tracking-tight">ตั้งค่าแชทบอท (AI Assistant)</h1>
                    <p className="text-gray-400 font-medium mt-1">จัดการ AI และพฤติกรรมการตอบกลับสำหรับเว็บไซต์ {siteName}</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-[1.5rem] font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all disabled:opacity-60 disabled:scale-100"
                >
                    {saving ? <RefreshCcw size={20} className="animate-spin" /> : <Save size={20} />}
                    {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                </button>
            </div>

            <AnimatePresence>
                {statusMsg && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`p-4 rounded-2xl flex items-center gap-3 border text-sm font-bold ${statusMsg.type === "success" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"}`}
                    >
                        <Info size={18} /> {statusMsg.text}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 p-1.5 bg-gray-50 rounded-2xl">
                <TabButton active={activeTab === "connection"} icon={<Wifi size={16} />} label="การเชื่อมต่อ" onClick={() => setActiveTab("connection")} />
                <TabButton active={activeTab === "personality"} icon={<MessageSquare size={16} />} label="การตอบกลับ" onClick={() => setActiveTab("personality")} />
                <TabButton active={activeTab === "knowledge"} icon={<Database size={16} />} label="ฐานความรู้ (RAG)" onClick={() => setActiveTab("knowledge")} />
                <TabButton active={activeTab === "advanced"} icon={<Settings2 size={16} />} label="ตั้งค่าขั้นสูง" onClick={() => setActiveTab("advanced")} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left: Main content */}
                <div className="xl:col-span-2 space-y-6">
                    {/* ========== CONNECTION TAB ========== */}
                    {activeTab === "connection" && (
                        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center"><Wifi size={20} /></div>
                                <h3 className="text-xl font-bold text-primary">การเชื่อมต่อ AI</h3>
                            </div>

                            {/* Provider */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">AI Provider</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { id: "openthaigpt", label: "OpenThaiGPT 🇹🇭", icon: <Sparkles size={16} />, model: "/model", hint: "โมเดลภาษาไทย (แนะนำ)" },
                                        { id: "gemini", label: "Google Gemini", icon: <Sparkles size={16} />, model: "gemini-1.5-flash", hint: "ฟรี / มี quota" },
                                        { id: "openai", label: "OpenAI / ChatGPT", icon: <Cpu size={16} />, model: "gpt-4o-mini", hint: "ต้องใช้บัตรเครดิต" },
                                        { id: "ollama", label: "Local (Ollama)", icon: <Terminal size={16} />, model: "llama3", hint: "ใช้บน Server ตัวเอง" },
                                    ].map(item => (
                                        <button
                                            key={item.id}
                                            onClick={() => setConfig({ ...config, provider: item.id, modelName: item.model })}
                                            className={`flex items-start gap-3 p-4 rounded-2xl border-2 font-bold text-sm transition-all text-left ${config.provider === item.id ? "border-primary bg-primary/5 text-primary shadow-md shadow-primary/10" : "border-gray-100 text-gray-400 hover:border-gray-200"}`}
                                        >
                                            <span className="mt-0.5 flex-shrink-0">{item.icon}</span>
                                            <div>
                                                <div>{item.label}</div>
                                                <div className={`text-[10px] font-medium mt-0.5 ${config.provider === item.id ? "text-primary/60" : "text-gray-300"}`}>{item.hint}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* API Key */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    {config.provider === "ollama" ? "Ollama URL (เช่น http://localhost:11434)" : "API Key"}
                                </label>
                                <div className="relative">
                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type={showApiKey ? "text" : "password"}
                                        placeholder={config.provider === "ollama" ? "http://localhost:11434" : "sk-... หรือ AIza..."}
                                        className="w-full pl-12 pr-12 py-4 bg-gray-50 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-primary/5 outline-none"
                                        value={config.apiKey || ""}
                                        onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                                    />
                                    <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                                        {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Model & Bot Name */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Model Name</label>
                                    <input
                                        type="text"
                                        placeholder="gemini-1.5-flash, gpt-4o..."
                                        className="w-full px-4 py-4 bg-gray-50 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-primary/5 outline-none"
                                        value={config.modelName || ""}
                                        onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">ชื่อบอท</label>
                                    <input
                                        type="text"
                                        placeholder="AI Assistant"
                                        className="w-full px-4 py-4 bg-gray-50 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-primary/5 outline-none"
                                        value={config.botName || ""}
                                        onChange={(e) => setConfig({ ...config, botName: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========== PERSONALITY TAB ========== */}
                    {activeTab === "personality" && (
                        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500"><MessageSquare size={20} /></div>
                                <h3 className="text-xl font-bold text-primary">ลักษณะนิสัยและการตอบกลับ</h3>
                            </div>

                            {/* Prompt Template */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Prompt Template (เลือกชุดคำสั่ง)</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {Object.entries(PROMPT_TEMPLATES).map(([key, tmpl]) => (
                                        <button
                                            key={key}
                                            onClick={() => handleTemplateChange(key)}
                                            className={`p-3 rounded-2xl border-2 text-sm font-bold text-left transition-all ${config.promptTemplate === key
                                                ? "border-primary bg-primary/5 text-primary"
                                                : "border-gray-100 text-gray-400 hover:border-gray-200"
                                                }`}
                                        >
                                            <BookOpen size={14} className="mb-1" />
                                            <div>{tmpl.labelTh}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* System Prompt */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">System Prompt / Instruction</label>
                                <textarea
                                    rows={5}
                                    className="w-full px-4 py-4 bg-gray-50 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-primary/5 outline-none resize-none"
                                    placeholder="กำหนดบทบาทและพฤติกรรมให้บอท เช่น คุณคือผู้เชี่ยวชาญด้านกฎหมาย..."
                                    value={config.systemPrompt || ""}
                                    onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                                />
                            </div>

                            {/* RAG Instructions */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    <Brain size={12} className="inline mr-1" />
                                    RAG Instructions (คำสั่งการใช้ข้อมูลอ้างอิง)
                                </label>
                                <textarea
                                    rows={3}
                                    className="w-full px-4 py-4 bg-gray-50 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-primary/5 outline-none resize-none"
                                    placeholder="เช่น: ให้ใช้ข้อมูลจากฐานความรู้เป็นหลัก อ้างอิงชื่อเอกสารที่ใช้..."
                                    value={config.ragInstructions || ""}
                                    onChange={(e) => setConfig({ ...config, ragInstructions: e.target.value })}
                                />
                            </div>

                            {/* Welcome Message */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Welcome Message</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-4 bg-gray-50 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-primary/5 outline-none"
                                    value={config.welcomeMessage || ""}
                                    onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                                />
                            </div>

                            {/* Fallback Message */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                                    <AlertTriangle size={12} className="inline mr-1" />
                                    Fallback Message (เมื่อไม่มีคำตอบ)
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-4 bg-gray-50 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-primary/5 outline-none"
                                    value={config.fallbackMessage || ""}
                                    onChange={(e) => setConfig({ ...config, fallbackMessage: e.target.value })}
                                />
                            </div>

                            {/* Suggested Questions */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                                    คำถามที่แนะนำ (Suggested Questions)
                                </label>
                                <div className="space-y-2 mb-3">
                                    {(config.suggestedQuestions || []).map((q: string, i: number) => (
                                        <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <Zap size={14} className="text-accent flex-shrink-0" />
                                            <span className="flex-1 text-sm font-medium text-gray-700">{q}</span>
                                            <button onClick={() => removeSuggestedQuestion(i)} className="text-gray-300 hover:text-rose-400 transition-colors">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newQuestion}
                                        onChange={(e) => setNewQuestion(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && addSuggestedQuestion()}
                                        placeholder="เพิ่มคำถาม เช่น PDPA คืออะไร?"
                                        className="flex-1 px-4 py-3 bg-gray-50 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-primary/5 outline-none border border-gray-100"
                                    />
                                    <button onClick={addSuggestedQuestion} className="px-4 py-3 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-accent transition-all flex items-center gap-2">
                                        <Plus size={16} /> เพิ่ม
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========== KNOWLEDGE BASE TAB ========== */}
                    {activeTab === "knowledge" && (
                        <div className="space-y-6">
                            {/* Upload Section */}
                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-500"><Database size={20} /></div>
                                    <div>
                                        <h3 className="text-xl font-bold text-primary">ฐานความรู้ (Knowledge Base)</h3>
                                        <p className="text-xs text-gray-400 mt-0.5">อัปโหลดเอกสารเพื่อให้แชทบอทใช้เป็นข้อมูลอ้างอิงในการตอบคำถาม (RAG)</p>
                                    </div>
                                </div>

                                {/* Upload Box */}
                                <div
                                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${uploading ? "border-primary/30 bg-primary/5" : "border-gray-200 hover:border-primary/40 hover:bg-gray-50 cursor-pointer"}`}
                                    onClick={() => !uploading && fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf,.txt,.md,.csv"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                    />
                                    {uploading ? (
                                        <div className="space-y-3">
                                            <Loader2 size={32} className="mx-auto text-primary animate-spin" />
                                            <p className="text-sm font-bold text-primary">{uploadProgress}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <Upload size={32} className="mx-auto text-gray-300" />
                                            <p className="text-sm font-bold text-gray-500">คลิกเพื่ออัปโหลดเอกสาร</p>
                                            <p className="text-xs text-gray-300">รองรับ PDF, TXT, MD, CSV (สูงสุด 10MB)</p>
                                        </div>
                                    )}
                                </div>

                                {uploadProgress && !uploading && (
                                    <p className={`text-sm font-bold ${uploadProgress.startsWith("✅") ? "text-emerald-500" : uploadProgress.startsWith("❌") ? "text-rose-500" : "text-primary"}`}>
                                        {uploadProgress}
                                    </p>
                                )}
                            </div>

                            {/* Document List */}
                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-primary">เอกสารในฐานความรู้ ({knowledgeDocs.length})</h3>
                                    <button onClick={fetchKnowledge} className="text-xs text-gray-400 hover:text-primary flex items-center gap-1 font-bold">
                                        <RefreshCcw size={12} /> รีเฟรช
                                    </button>
                                </div>

                                {knowledgeLoading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
                                    </div>
                                ) : knowledgeDocs.length === 0 ? (
                                    <div className="text-center py-12">
                                        <FileText size={40} className="mx-auto text-gray-200 mb-3" />
                                        <p className="text-sm text-gray-400 font-medium">ยังไม่มีเอกสาร — อัปโหลดไฟล์ด้านบนเพื่อเริ่มต้น</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {knowledgeDocs.map((doc: any) => (
                                            <div key={doc.documentId} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all group">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${doc.isActive ? "bg-emerald-50 text-emerald-500" : "bg-gray-50 text-gray-300"}`}>
                                                    <FileText size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-sm text-primary truncate">{doc.title}</h4>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${doc.status === "ready" ? "text-emerald-500" : doc.status === "error" ? "text-rose-500" : "text-amber-500"}`}>
                                                            {doc.status === "ready" ? "● พร้อมใช้" : doc.status === "error" ? "● ผิดพลาด" : "● กำลังประมวลผล"}
                                                        </span>
                                                        <span className="text-[10px] text-gray-300">{doc.chunkCount || 0} chunks</span>
                                                        <span className="text-[10px] text-gray-300">{new Date(doc.createdAt).toLocaleDateString("th-TH")}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => toggleKnowledgeActive(doc.documentId, doc.isActive)}
                                                        className={`p-2 rounded-xl transition-colors ${doc.isActive ? "text-emerald-500 hover:bg-emerald-50" : "text-gray-300 hover:bg-gray-50"}`}
                                                        title={doc.isActive ? "ปิดการใช้งาน" : "เปิดการใช้งาน"}
                                                    >
                                                        {doc.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                                    </button>
                                                    <button
                                                        onClick={() => deleteKnowledge(doc.documentId)}
                                                        className="p-2 rounded-xl text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                                        title="ลบเอกสาร"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ========== ADVANCED TAB ========== */}
                    {activeTab === "advanced" && (
                        <div className="space-y-6">
                            {/* Generation Parameters */}
                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500"><Settings2 size={20} /></div>
                                    <h3 className="text-xl font-bold text-primary">พารามิเตอร์การสร้างข้อความ</h3>
                                </div>

                                {/* Temperature */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Temperature</label>
                                        <span className="text-lg font-black text-primary">{config.temperature}</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="1" step="0.1"
                                        className="w-full accent-primary"
                                        value={config.temperature || 0.7}
                                        onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                                    />
                                    <div className="flex justify-between text-[9px] font-bold text-gray-300 mt-1 uppercase">
                                        <span>Precise (แม่นยำ)</span>
                                        <span>Creative (สร้างสรรค์)</span>
                                    </div>
                                </div>

                                {/* Top-P */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Top-P (Nucleus Sampling)</label>
                                        <span className="text-lg font-black text-primary">{config.topP}</span>
                                    </div>
                                    <input
                                        type="range" min="0.1" max="1" step="0.05"
                                        className="w-full accent-primary"
                                        value={config.topP || 0.9}
                                        onChange={(e) => setConfig({ ...config, topP: parseFloat(e.target.value) })}
                                    />
                                    <div className="flex justify-between text-[9px] font-bold text-gray-300 mt-1 uppercase">
                                        <span>Focused (เน้น)</span>
                                        <span>Diverse (หลากหลาย)</span>
                                    </div>
                                </div>

                                {/* Max Tokens */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Max Tokens (ความยาวคำตอบ)</label>
                                        <span className="text-lg font-black text-primary">{config.maxTokens}</span>
                                    </div>
                                    <input
                                        type="range" min="256" max="4096" step="256"
                                        className="w-full accent-primary"
                                        value={config.maxTokens || 1024}
                                        onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) })}
                                    />
                                    <div className="flex justify-between text-[9px] font-bold text-gray-300 mt-1">
                                        <span>256 (สั้น)</span>
                                        <span>4096 (ยาว)</span>
                                    </div>
                                </div>

                                {/* History Length */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">History Length (ข้อความย้อนหลัง)</label>
                                        <span className="text-lg font-black text-primary">{config.historyLength} ข้อความ</span>
                                    </div>
                                    <input
                                        type="range" min="2" max="20" step="2"
                                        className="w-full accent-primary"
                                        value={config.historyLength || 10}
                                        onChange={(e) => setConfig({ ...config, historyLength: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>

                            {/* Response Style */}
                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500"><Type size={20} /></div>
                                    <h3 className="text-xl font-bold text-primary">รูปแบบการตอบ</h3>
                                </div>

                                {/* Response Language */}
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">ภาษาในการตอบ</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: "thai", label: "🇹🇭 ไทย" },
                                            { id: "english", label: "🇬🇧 English" },
                                            { id: "auto", label: "🌐 อัตโนมัติ" },
                                        ].map(lang => (
                                            <button
                                                key={lang.id}
                                                onClick={() => setConfig({ ...config, responseLanguage: lang.id })}
                                                className={`p-3 rounded-2xl border-2 text-sm font-bold text-center transition-all ${config.responseLanguage === lang.id ? "border-primary bg-primary/5 text-primary" : "border-gray-100 text-gray-400 hover:border-gray-200"}`}
                                            >
                                                {lang.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Response Format */}
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">ลักษณะการตอบ</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { id: "concise", label: "กระชับ", hint: "สั้นตรงประเด็น" },
                                            { id: "detailed", label: "ละเอียด", hint: "อธิบายเพิ่ม" },
                                            { id: "bullet_points", label: "เป็นข้อๆ", hint: "Bullet points" },
                                        ].map(fmt => (
                                            <button
                                                key={fmt.id}
                                                onClick={() => setConfig({ ...config, responseFormat: fmt.id })}
                                                className={`p-3 rounded-2xl border-2 text-sm font-bold text-center transition-all ${config.responseFormat === fmt.id ? "border-primary bg-primary/5 text-primary" : "border-gray-100 text-gray-400 hover:border-gray-200"}`}
                                            >
                                                <div>{fmt.label}</div>
                                                <div className="text-[10px] font-medium mt-0.5 opacity-60">{fmt.hint}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Show Sources Toggle */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                    <div>
                                        <div className="text-sm font-bold text-primary">แสดงแหล่งอ้างอิง</div>
                                        <div className="text-[10px] text-gray-400">ระบุชื่อเอกสารที่ใช้อ้างอิงท้ายคำตอบ</div>
                                    </div>
                                    <button
                                        onClick={() => setConfig({ ...config, showSources: !config.showSources })}
                                        className={`${config.showSources ? "text-emerald-500" : "text-gray-300"}`}
                                    >
                                        {config.showSources ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                                    </button>
                                </div>

                                {/* Restricted Topics */}
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                                        <AlertTriangle size={12} className="inline mr-1" />
                                        หัวข้อที่ห้ามตอบ (Restricted Topics)
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {(config.restrictedTopics || []).map((topic: string, i: number) => (
                                            <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-500 rounded-xl text-xs font-bold border border-rose-100">
                                                {topic}
                                                <button onClick={() => removeRestriction(i)} className="hover:text-rose-700"><X size={12} /></button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newRestriction}
                                            onChange={(e) => setNewRestriction(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && addRestriction()}
                                            placeholder="เช่น การเมือง, ข้อมูลลับ..."
                                            className="flex-1 px-4 py-3 bg-gray-50 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-primary/5 outline-none border border-gray-100"
                                        />
                                        <button onClick={addRestriction} className="px-4 py-3 bg-rose-500 text-white rounded-2xl font-bold text-sm hover:bg-rose-600 transition-all flex items-center gap-2">
                                            <Plus size={16} /> เพิ่ม
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Status + Live Test */}
                <div className="space-y-6">
                    {/* Status Toggle */}
                    <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
                        <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center transition-colors ${config.isEnabled ? "bg-emerald-50 text-emerald-500" : "bg-gray-50 text-gray-300"}`}>
                            <Bot size={40} className={config.isEnabled ? "animate-bounce" : ""} />
                        </div>
                        <h4 className="font-bold text-primary mb-1">สถานะแชทบอท</h4>
                        <p className={`text-[10px] mb-4 uppercase tracking-widest font-black ${config.isEnabled ? "text-emerald-500" : "text-gray-400"}`}>
                            {config.isEnabled ? "● เปิดใช้งาน" : "○ ปิดใช้งาน"}
                        </p>
                        <button
                            onClick={() => setConfig({ ...config, isEnabled: !config.isEnabled })}
                            className={`w-full py-3 rounded-xl font-bold text-xs transition-all ${config.isEnabled ? "bg-rose-50 text-rose-500 hover:bg-rose-100" : "bg-emerald-50 text-emerald-500 hover:bg-emerald-100"}`}
                        >
                            {config.isEnabled ? "ปิดการใช้งาน" : "เปิดการใช้งาน"}
                        </button>
                    </div>

                    {/* Knowledge Stats */}
                    <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-6 rounded-[2.5rem] text-white space-y-3">
                        <div className="flex items-center gap-2">
                            <Brain size={18} />
                            <h4 className="font-bold text-sm">ฐานความรู้</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/10 rounded-xl p-3 text-center">
                                <div className="text-2xl font-black">{knowledgeDocs.length}</div>
                                <div className="text-[10px] text-white/60 font-medium">เอกสาร</div>
                            </div>
                            <div className="bg-white/10 rounded-xl p-3 text-center">
                                <div className="text-2xl font-black">
                                    {knowledgeDocs.reduce((sum: number, d: any) => sum + (d.chunkCount || 0), 0)}
                                </div>
                                <div className="text-[10px] text-white/60 font-medium">Chunks</div>
                            </div>
                        </div>
                        <div className="text-[10px] text-white/50 font-medium">
                            เอกสารที่เปิดใช้งาน: {knowledgeDocs.filter((d: any) => d.isActive).length} /{" "}{knowledgeDocs.length}
                        </div>
                    </div>

                    {/* Security */}
                    <div className="bg-primary p-6 rounded-[2.5rem] text-white space-y-3">
                        <div className="flex items-center gap-2">
                            <Shield size={18} className="text-accent" />
                            <h4 className="font-bold text-sm">ความปลอดภัย</h4>
                        </div>
                        <p className="text-[10px] text-blue-100/60 leading-relaxed font-medium">
                            API Key จะถูกเข้ารหัสและเข้าถึงได้เฉพาะเจ้าหน้าที่ดูแลระบบเท่านั้น ห้ามแชร์กุญแจนี้กับผู้อื่น
                        </p>
                    </div>

                    {/* Live Test Panel */}
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-gray-50 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center text-violet-500">
                                <Zap size={16} />
                            </div>
                            <div>
                                <h3 className="font-bold text-primary text-sm">ทดสอบบอทสด</h3>
                                <p className="text-[10px] text-gray-400">กด "บันทึก" ก่อนทดสอบ</p>
                            </div>
                            {testMessages.length > 0 && (
                                <button onClick={() => setTestMessages([])} className="ml-auto text-[10px] text-gray-400 hover:text-rose-400 transition-colors font-bold">
                                    ล้าง
                                </button>
                            )}
                        </div>

                        <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gray-50/40">
                            {testMessages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center">
                                    <Bot size={32} className="text-gray-200 mb-2" />
                                    <p className="text-xs text-gray-300 font-medium">พิมพ์คำถามเพื่อทดสอบ</p>
                                </div>
                            ) : (
                                testMessages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium leading-relaxed ${msg.role === "user" ? "bg-primary text-white rounded-tr-sm" : "bg-white text-primary border border-gray-100 rounded-tl-sm"}`}>
                                            {msg.content || (testLoading && i === testMessages.length - 1 ? (
                                                <span className="flex gap-1">
                                                    <span className="w-1 h-1 bg-gray-300 rounded-full animate-bounce" />
                                                    <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                                                    <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce [animation-delay:0.3s]" />
                                                </span>
                                            ) : "")}
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={testEndRef} />
                        </div>

                        <form onSubmit={handleLiveTest} className="p-3 bg-white border-t border-gray-50 flex gap-2">
                            <input
                                type="text"
                                value={testInput}
                                onChange={(e) => setTestInput(e.target.value)}
                                placeholder="ทดสอบถามบอท..."
                                disabled={testLoading}
                                className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/10"
                            />
                            <button
                                type="submit"
                                disabled={testLoading || !testInput.trim()}
                                className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-accent transition-all disabled:opacity-40"
                            >
                                <Send size={16} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
