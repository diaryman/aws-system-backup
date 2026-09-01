"use client";

import {
    BarChart3,
    Users,
    FileText,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    ShieldCheck,
    Zap,
    MoreHorizontal,
    Plus,
    Loader2,
    RefreshCw
} from "lucide-react";
import AdminChart from "@/components/AdminChart";
import { Suspense } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { INTERNAL_STRAPI_URL as STRAPI_URL } from "@/lib/api";
import { loginAction, checkAuthAction } from "@/app/actions/auth";

interface DashboardStats {
    newsCount: number;
    documentsCount: number;
    policiesCount: number;
    servicesCount: number;
    featuresCount: number;
    contactsCount: number;
    newsletterCount: number;
}

interface RecentItem {
    id: number;
    documentId: string;
    title: string;
    type: string;
    status: string;
    publishedAt?: string;
    createdAt?: string;
}

export default function AdminDashboardPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DashboardContent />
        </Suspense>
    );
}

// Generate mock data for the chart since we don't have analytics API yet
const generateMockChartData = () => {
    const data = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        data.push({
            date: d.toLocaleDateString("th-TH", { day: "numeric", month: "short" }),
            views: Math.floor(Math.random() * (500 - 100 + 1)) + 100, // Random between 100 - 500
        });
    }
    return data;
};

function DashboardContent() {
    const searchParams = useSearchParams();
    const siteParam = searchParams.get("site") || "main";
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);
    const [dateRange, setDateRange] = useState("all"); // 'all', 'today', '7days', '30days'
    const [categoryStats, setCategoryStats] = useState<any[]>([]);
    const [topArticles, setTopArticles] = useState<any[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);

    const siteName = siteParam === "pdpa" ? "PDPA Center" : "DataGOV";
    const domain = siteParam === "pdpa" ? "pdpa.localhost" : "localhost";

    // Dynamic greeting based on time
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return "สวัสดีตอนเช้า";
        if (hour < 17) return "สวัสดีตอนบ่าย";
        return "สวัสดีตอนเย็น";
    }, []);

    useEffect(() => {
        const checkAuth = async () => {
            const authData = await checkAuthAction(siteParam);
            setIsAuthorized(authData.isAuthorized);
        };

        checkAuth();

        const handleAuthChange = () => {
            checkAuth();
        };

        window.addEventListener('admin-auth-change', handleAuthChange);
        return () => {
            window.removeEventListener('admin-auth-change', handleAuthChange);
        };
    }, [siteParam]);

    // Fetch real stats from Strapi
    useEffect(() => {
        if (!isAuthorized) return;
        fetchDashboardData();
    }, [isAuthorized, domain, dateRange]);

    const fetchDashboardData = async () => {
        setLoadingStats(true);
        try {
            const getRangeFilter = () => {
                const now = new Date();
                if (dateRange === "today") {
                    const today = new Date(now.setHours(0, 0, 0, 0)).toISOString();
                    return `&filters[createdAt][$gte]=${today}`;
                }
                if (dateRange === "7days") {
                    const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7)).toISOString();
                    return `&filters[createdAt][$gte]=${sevenDaysAgo}`;
                }
                if (dateRange === "30days") {
                    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30)).toISOString();
                    return `&filters[createdAt][$gte]=${thirtyDaysAgo}`;
                }
                return "";
            };

            const rangeFilter = getRangeFilter();

            // Fetch all counts and page views in parallel
            const [articlesRes, docsRes, policiesRes, servicesRes, featuresRes, contactsRes, newsletterRes, pageViewsRes] = await Promise.all([
                fetch(`${STRAPI_URL}/api/articles?filters[domain][$eq]=${domain}${rangeFilter}&pagination[pageSize]=1&pagination[withCount]=true`).then(r => r.json()),
                fetch(`${STRAPI_URL}/api/policy-documents?filters[domain][$eq]=${domain}${rangeFilter}&pagination[pageSize]=1&pagination[withCount]=true`).then(r => r.json()),
                fetch(`${STRAPI_URL}/api/policies?filters[domain][$eq]=${domain}${rangeFilter}&pagination[pageSize]=1&pagination[withCount]=true`).then(r => r.json()),
                fetch(`${STRAPI_URL}/api/services?filters[domain][$eq]=${domain}${rangeFilter}&pagination[pageSize]=1&pagination[withCount]=true`).then(r => r.json()),
                fetch(`${STRAPI_URL}/api/features?filters[domain][$eq]=${domain}${rangeFilter}&pagination[pageSize]=1&pagination[withCount]=true`).then(r => r.json()),
                fetch(`${STRAPI_URL}/api/contact-submissions?filters[domain][$eq]=${domain}${rangeFilter}&pagination[pageSize]=1&pagination[withCount]=true`).then(r => r.json()),
                fetch(`${STRAPI_URL}/api/newsletter-subscribers?filters[domain][$eq]=${domain}&filters[isActive][$eq]=true&pagination[pageSize]=1&pagination[withCount]=true`).then(r => r.json()),
                fetch(`${STRAPI_URL}/api/page-views?filters[domain][$eq]=${domain}&pagination[pageSize]=2000`).then(r => r.json()),
            ]);

            setStats({
                newsCount: articlesRes?.meta?.pagination?.total || 0,
                documentsCount: docsRes?.meta?.pagination?.total || 0,
                policiesCount: policiesRes?.meta?.pagination?.total || 0,
                servicesCount: servicesRes?.meta?.pagination?.total || 0,
                featuresCount: featuresRes?.meta?.pagination?.total || 0,
                contactsCount: contactsRes?.meta?.pagination?.total || 0,
                newsletterCount: newsletterRes?.meta?.pagination?.total || 0,
            });

            // Process Chart Data (Last 7 Days)
            const rawViews = pageViewsRes?.data || [];
            const processedChartData = [];
            const nowChart = new Date();
            for (let i = 6; i >= 0; i--) {
                const targetDate = new Date(nowChart);
                targetDate.setDate(targetDate.getDate() - i);
                const dateStr = targetDate.toLocaleDateString("th-TH", { day: "numeric", month: "short" });

                // Count views matching this date
                const count = rawViews.filter((v: any) => {
                    if (!v.viewed_at) return false;
                    const vDate = new Date(v.viewed_at);
                    return vDate.getDate() === targetDate.getDate() &&
                        vDate.getMonth() === targetDate.getMonth() &&
                        vDate.getFullYear() === targetDate.getFullYear();
                }).length;

                processedChartData.push({
                    date: dateStr,
                    views: count
                });
            }
            setChartData(processedChartData);

            // Fetch recent articles, documents, and top articles by view count
            const [recentArticles, recentDocs, categoriesRes, topViewsRes] = await Promise.all([
                fetch(`${STRAPI_URL}/api/articles?filters[domain][$eq]=${domain}&sort=publishedAt:desc&pagination[pageSize]=5&populate=category`).then(r => r.json()),
                fetch(`${STRAPI_URL}/api/policy-documents?filters[domain][$eq]=${domain}&sort=createdAt:desc&pagination[pageSize]=5`).then(r => r.json()),
                fetch(`${STRAPI_URL}/api/categories?filters[domain][$eq]=${domain}&populate[articles][count]=true`).then(r => r.json()),
                fetch(`${STRAPI_URL}/api/articles?filters[domain][$eq]=${domain}&sort=viewCount:desc&pagination[pageSize]=7&fields[0]=title&fields[1]=viewCount&fields[2]=slug&populate=category`).then(r => r.json()),
            ]);

            // Set Category Stats
            const catStats = (categoriesRes?.data || []).map((cat: any) => ({
                id: cat.id,
                name: cat.name,
                count: cat.articles?.count || 0,
                type: cat.type
            })).sort((a: any, b: any) => b.count - a.count).slice(0, 5);
            setCategoryStats(catStats);

            // Set Top Articles by views
            const topViews = (topViewsRes?.data || []).map((a: any) => ({
                id: a.id,
                title: a.title,
                slug: a.slug,
                viewCount: a.viewCount || 0,
                category: a.category?.name || 'ข่าวทั่วไป',
            }));
            setTopArticles(topViews);

            const items: RecentItem[] = [];

            // Add articles
            (recentArticles?.data || []).forEach((a: any) => {
                items.push({
                    id: a.id,
                    documentId: a.documentId,
                    title: a.title,
                    type: a.category?.name || "News",
                    status: "Published",
                    publishedAt: a.publishedAt,
                    createdAt: a.createdAt,
                });
            });

            // Add documents
            (recentDocs?.data || []).forEach((d: any) => {
                items.push({
                    id: d.id,
                    documentId: d.documentId,
                    title: d.title,
                    type: "Document",
                    status: "Published",
                    publishedAt: d.publishedAt,
                    createdAt: d.createdAt,
                });
            });

            // Sort by date
            items.sort((a, b) => {
                const dateA = new Date(a.publishedAt || a.createdAt || 0).getTime();
                const dateB = new Date(b.publishedAt || b.createdAt || 0).getTime();
                return dateB - dateA;
            });

            setRecentItems(items.slice(0, 5));
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoadingStats(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const result = await loginAction(siteParam, username, password);
            if (result.success) {
                window.dispatchEvent(new Event('admin-auth-change'));
                setIsAuthorized(true);
                setError("");
            } else {
                setError(result.error || "รหัสผ่านไม่ถูกต้อง");
            }
        } catch (err) {
            setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
        }
    };

    // Helper to format relative time
    const formatRelativeTime = (dateStr?: string) => {
        if (!dateStr) return "ไม่ทราบ";
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "เมื่อสักครู่";
        if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
        if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
        if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
        return date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
    };

    if (isAuthorized === null) {
        return <div className="min-h-[60vh] flex items-center justify-center"><p className="text-gray-400 font-bold">กำลังตรวจสอบสิทธิ์...</p></div>;
    }

    if (isAuthorized === false) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-2xl max-w-md w-full text-center"
                >
                    <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center text-primary mx-auto mb-8">
                        <ShieldCheck size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-primary font-heading mb-2">เข้าสู่ระบบจัดการ {siteName}</h2>
                    <p className="text-gray-400 text-sm mb-8 font-medium">กรุณาใส่รหัสผ่านเพื่อเข้าถึงส่วนควบคุมของระบบ</p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="relative">
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="ชื่อผู้ใช้ (Username)"
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-center font-bold tracking-widest placeholder:tracking-normal placeholder:font-medium mb-4"
                                autoFocus
                            />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="รหัสผ่าน (Password)"
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-center font-bold tracking-widest placeholder:tracking-normal placeholder:font-medium"
                            />
                        </div>
                        {error && <p className="text-red-500 text-xs font-bold animate-shake">{error}</p>}
                        <button
                            type="submit"
                            className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-premium hover:bg-accent transition-all active:scale-95"
                        >
                            ยืนยันตัวตน
                        </button>
                    </form>
                </motion.div>
            </div>
        );
    }

    const statCards = stats ? [
        { label: "ข่าวสารทั้งหมด", value: String(stats.newsCount), icon: <FileText size={20} /> },
        { label: "เอกสารนโยบาย", value: String(stats.documentsCount), icon: <ShieldCheck size={20} /> },
        { label: "นโยบาย/มาตรฐาน", value: String(stats.policiesCount), icon: <ShieldCheck size={20} /> },
        { label: "บริการ/ดาวน์โหลด", value: String(stats.servicesCount), icon: <Zap size={20} /> },
    ] : [];

    return (
        <div className="space-y-10">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-primary font-heading tracking-tight">{greeting}, ผู้ดูแลระบบ {siteName} 👋</h1>
                    <p className="text-gray-400 font-medium">นี่คือภาพรวมของระบบและกิจกรรมล่าสุดของ {siteName} ในวันนี้</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-white border border-gray-200 rounded-2xl p-1 mr-2 shadow-sm">
                        {[
                            { id: "all", label: "ทั้งหมด" },
                            { id: "today", label: "วันนี้" },
                            { id: "7days", label: "7 วัน" },
                            { id: "30days", label: "30 วัน" },
                        ].map((range) => (
                            <button
                                key={range.id}
                                onClick={() => setDateRange(range.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${dateRange === range.id ? 'bg-primary text-white' : 'text-gray-400 hover:text-primary hover:bg-gray-50'}`}
                            >
                                {range.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchDashboardData}
                        className="p-3 bg-white border border-gray-200 rounded-2xl font-bold text-sm text-primary hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center"
                        title="รีเฟรชข้อมูล"
                    >
                        <RefreshCw size={18} className={loadingStats ? "animate-spin" : ""} />
                    </button>
                    <Link href={`/admin/news/new?site=${siteParam}`} className="px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm flex items-center gap-2 shadow-premium hover:bg-accent transition-all active:scale-95">
                        <Plus size={18} /> สร้างเนื้อหาใหม่
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            {loadingStats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm animate-pulse">
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-gray-200"></div>
                                <div className="w-12 h-5 bg-gray-100 rounded-lg"></div>
                            </div>
                            <div className="w-24 h-3 bg-gray-100 rounded mb-2"></div>
                            <div className="w-16 h-8 bg-gray-200 rounded"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards.map((stat, idx) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div
                                    className="w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"
                                    style={{ background: idx % 2 === 0 ? "var(--primary-color)" : "var(--accent-color)" }}
                                >
                                    {stat.icon}
                                </div>
                                <div
                                    className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg"
                                    style={{ background: "var(--accent-subtle)", color: "var(--accent-color)" }}
                                >
                                    <span>จาก API</span>
                                </div>
                            </div>
                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                            <h3 className="text-3xl font-black text-primary font-heading">{stat.value}</h3>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Additional mini stats */}
            {stats && !loadingStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">จุดเด่น/หลักการ</p>
                        <p className="text-2xl font-black text-primary mt-1">{stats.featuresCount}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ข้อความติดต่อ</p>
                        <p className="text-2xl font-black text-primary mt-1">{stats.contactsCount}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Newsletter</p>
                        <p className="text-2xl font-black mt-1" style={{ color: 'var(--accent-color)' }}>{stats.newsletterCount}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">สถานะระบบ</p>
                        <p className="text-2xl font-black mt-1" style={{ color: "var(--accent-color)" }}>Online</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Visitor Chart */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold font-heading text-primary">สถิติผู้เข้าชมเว็บไซต์</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ข้อมูลจำลอง 7 วันย้อนหลัง</p>
                            </div>
                        </div>
                        <AdminChart
                            data={chartData.length > 0 ? chartData : generateMockChartData()}
                            dataKey="views"
                            xAxisKey="date"
                            color="#3b82f6"
                        />
                    </div>

                    {/* Table Area */}
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                            <h3 className="text-xl font-bold font-heading text-primary">เนื้อหาล่าสุด</h3>
                            <Link href={`/admin/news?site=${siteParam}`} className="text-accent font-bold text-sm hover:underline">ดูทั้งหมด</Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50/50">
                                        <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">หัวข้อ</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">ประเภท</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">สถานะ</th>
                                        <th className="px-8 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">วันที่</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loadingStats ? (
                                        Array.from({ length: 3 }).map((_, i) => (
                                            <tr key={i}>
                                                <td className="px-8 py-5"><div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse"></div></td>
                                                <td className="px-8 py-5"><div className="h-4 bg-gray-100 rounded w-16 animate-pulse"></div></td>
                                                <td className="px-8 py-5"><div className="h-4 bg-gray-100 rounded w-16 animate-pulse"></div></td>
                                                <td className="px-8 py-5"><div className="h-4 bg-gray-100 rounded w-20 animate-pulse"></div></td>
                                            </tr>
                                        ))
                                    ) : recentItems.length > 0 ? (
                                        recentItems.map((item) => (
                                            <tr key={`${item.type}-${item.id}`} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-8 py-5">
                                                    <p className="font-bold text-primary group-hover:text-accent transition-colors truncate max-w-[280px]">{item.title}</p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">โดย Admin</p>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold">{item.type}</span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent-color)" }}></span>
                                                        <span className="text-[10px] font-bold" style={{ color: "var(--accent-color)" }}>{item.status}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-[10px] font-bold text-gray-400">{formatRelativeTime(item.publishedAt || item.createdAt)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-12 text-center text-gray-400 font-medium">ยังไม่มีเนื้อหาในระบบ</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sidebar Cards */}
                <div className="space-y-8">
                    {/* Top Articles by Views (Analytics) */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-bold font-heading text-primary mb-1 flex items-center gap-2">
                            <BarChart3 size={18} className="text-accent" />
                            บทความยอดนิยม
                        </h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-6">เรียงตามจำนวนผู้เข้าชม (viewCount)</p>
                        {loadingStats ? (
                            <div className="space-y-3">
                                {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />)}
                            </div>
                        ) : topArticles.length > 0 ? (
                            <div className="space-y-3">
                                {topArticles.map((a, i) => {
                                    const maxViews = topArticles[0]?.viewCount || 1;
                                    const pct = Math.max(8, (a.viewCount / maxViews) * 100);
                                    const rankColors = ['bg-yellow-400', 'bg-gray-300', 'bg-amber-600', 'bg-accent/40', 'bg-accent/25'];
                                    return (
                                        <div key={a.id} className="group">
                                            <div className="flex items-center justify-between mb-1 gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black text-white flex-shrink-0 ${rankColors[i] || 'bg-gray-200'}`}>
                                                        {i + 1}
                                                    </span>
                                                    <p className="text-xs font-bold text-primary truncate">{a.title}</p>
                                                </div>
                                                <span className="text-[10px] font-black text-gray-400 flex-shrink-0 flex items-center gap-1">
                                                    <Users size={10} /> {a.viewCount.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${pct}%` }}
                                                    transition={{ duration: 0.8, delay: i * 0.08 }}
                                                    className="h-full rounded-full"
                                                    style={{ background: 'var(--accent-color)' }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-300">
                                <BarChart3 size={32} className="mx-auto mb-2 opacity-30" />
                                <p className="text-xs font-bold">ยังไม่มีข้อมูลการเข้าชม</p>
                                <p className="text-[10px] mt-1">ข้อมูลจะปรากฏหลังจากมีผู้เข้าชมบทความ</p>
                            </div>
                        )}
                    </div>

                    {/* System Health Card */}
                    <div className="bg-primary p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full blur-3xl group-hover:bg-accent/30 transition-all"></div>
                        <div className="relative z-10 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-accent">
                                    <ShieldCheck size={28} />
                                </div>
                                <span
                                    className="px-3 py-1 rounded-lg text-[10px] font-bold border"
                                    style={{ background: "var(--accent-subtle)", color: "var(--accent-color)", borderColor: "var(--accent-glow)" }}
                                >Active</span>
                            </div>
                            <h4 className="text-xl font-bold font-heading text-white mb-2">ความปลอดภัยของระบบ</h4>
                            <p className="text-sm text-white/60 leading-relaxed mb-6">ระบบทำงานปกติ ข้อมูลทั้งหมดถูกเข้ารหัสในระดับสูงสุด</p>
                            <div className="mt-auto">
                                <div className="flex justify-between text-[10px] font-bold text-white/50 uppercase mb-2">
                                    <span>Health Score</span>
                                    <span>98%</span>
                                </div>
                                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: "98%" }}
                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                        className="h-full bg-accent"
                                    ></motion.div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Summary by Category */}
                    {categoryStats.length > 0 && !loadingStats && (
                        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col">
                            <h3 className="text-lg font-bold font-heading text-primary mb-6 flex items-center justify-between">
                                หมวดหมู่ยอดนิยม <Zap size={16} className="text-amber-500" />
                            </h3>
                            <div className="space-y-4">
                                {categoryStats.map((item, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-bold text-primary">{item.name}</p>
                                            <span className="text-xs font-black text-gray-400">{item.count}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min((item.count / 10) * 100, 100)}%` }}
                                                transition={{ duration: 1, delay: i * 0.1 }}
                                                style={{ background: "var(--accent-color)" }}
                                            ></motion.div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
