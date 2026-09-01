import { fetchAPI, getStrapiMedia } from "@/lib/api";
import BlockRenderer from "@/components/BlockRenderer";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NewsTicker from "@/components/NewsTicker";
import { ArrowLeft, Calendar, Clock, User, Bookmark, MoreHorizontal, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import PrintButton from "@/components/PrintButton";
import { trackArticleView } from "@/app/actions/article";
import NewsletterSection from "@/components/NewsletterSection";
import ShareButton from "@/components/ShareButton";

// Generate Metadata (SEO)
export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
    const params = await props.params;
    const data = await fetchAPI("/articles", {
        filters: { slug: params.slug },
        populate: { coverImage: true, ogImage: true, category: true },
    });

    const article = data.data?.[0];
    if (!article) return { title: "ไม่พบบทความ" };

    const isPDPA = article.domain === 'pdpa.localhost';
    const siteName = isPDPA ? "PDPA Center" : "DataGOV";

    const title = article.seoTitle || `${article.title} | ${siteName}`;
    const description = article.seoDescription || article.description || "อ่านรายละเอียดข่าวสารและกิจกรรมล่าสุด";
    const ogImageUrl = article.ogImage?.url
        ? getStrapiMedia(article.ogImage.url)
        : article.coverImage?.url
            ? getStrapiMedia(article.coverImage.url)
            : undefined;

    return {
        title,
        description,
        keywords: article.seoKeywords || undefined,
        openGraph: {
            title,
            description,
            type: "article",
            publishedTime: article.publishedAt,
            ...(ogImageUrl ? { images: [{ url: ogImageUrl, width: 1200, height: 630 }] } : {})
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            ...(ogImageUrl ? { images: [ogImageUrl] } : {})
        }
    };
}

export default async function ArticlePage(props: { params: Promise<{ slug: string }> }) {
    const params = await props.params;
    const data = await fetchAPI("/articles", {
        filters: { slug: params.slug },
        populate: {
            content: {
                on: {
                    "shared.rich-text": { populate: "*" },
                    "shared.hero": { populate: "*" },
                    "shared.gallery": {
                        populate: { images: true }
                    }
                }
            },
            coverImage: true,
            category: true
        },
    });

    const article = data.data?.[0];
    if (!article) notFound();

    // Fire-and-forget: track page view (never blocks rendering)
    void trackArticleView(article.documentId);

    const domain = article.domain || "localhost";
    const siteParam = domain === "pdpa.localhost" ? "pdpa" : "main";
    const date = new Date(article.publishedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    const coverImageUrl = article.coverImage?.url ? getStrapiMedia(article.coverImage.url) : null;

    let announcement = undefined;
    let notifications = undefined;
    let prevArticle = null;
    let nextArticle = null;
    try {
        const config = await fetchAPI("/site-configs", {
            filters: { domain }
        });
        const siteConfig = config.data?.[0];
        announcement = siteConfig?.announcement;
        notifications = siteConfig?.notifications;

        // Fetch prev and next
        const [prevRes, nextRes] = await Promise.all([
            fetchAPI("/articles", { filters: { domain, publishedAt: { $lt: article.publishedAt } }, sort: ["publishedAt:desc"], pagination: { pageSize: 1 } }),
            fetchAPI("/articles", { filters: { domain, publishedAt: { $gt: article.publishedAt } }, sort: ["publishedAt:asc"], pagination: { pageSize: 1 } })
        ]);
        prevArticle = prevRes.data?.[0] || null;
        nextArticle = nextRes.data?.[0] || null;
    } catch (e) {
        console.error("Error fetching article dependencies", e);
    }

    return (
        <main id="main-content" className="min-h-screen bg-[#fcfdfe]">
            <NewsTicker domain={domain} announcement={announcement} notifications={notifications} />
            <Navbar domain={domain} />

            {/* Reading Context Header */}
            <div className="pt-[calc(8rem+44px)] pb-12 bg-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-6">
                        <Breadcrumb
                            currentLabel={article.title}
                            homeHref="/"
                            homeName={domain === "pdpa.localhost" ? "PDPA Center" : "DataGOV"}
                        />
                        <div className="flex items-center gap-3">
                            <button className="p-2 text-gray-400 hover:text-accent transition-colors"><Bookmark size={20} /></button>
                            <button className="p-2 text-gray-400 hover:text-accent transition-colors"><MoreHorizontal size={20} /></button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <span
                            className="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest inline-block"
                            style={{ background: "var(--accent-subtle)", color: "var(--accent-color)", border: "1px solid var(--accent-glow)" }}
                        >
                            {article.category?.name || "Governance Update"}
                        </span>
                        <h1 className="text-4xl md:text-5xl font-black font-heading text-primary leading-[1.1] tracking-tighter">
                            {article.title}
                        </h1>

                        <div className="flex flex-wrap items-center gap-8 pt-4 pb-8 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center"
                                    style={{ background: "var(--accent-subtle)", color: "var(--accent-color)" }}
                                >
                                    <User size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Author</p>
                                    <p className="text-sm font-bold text-primary">Admin Court TH</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-accent"
                                    style={{ background: "var(--accent-subtle)" }}
                                >
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Published</p>
                                    <p className="text-sm font-bold text-primary">{date}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-accent"
                                    style={{ background: "var(--accent-subtle)" }}
                                >
                                    <Clock size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Time</p>
                                    <p className="text-sm font-bold text-primary">{new Date(article.publishedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Article Content Area */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <article className="bg-white rounded-[3rem] shadow-premium border border-white p-8 md:p-16 relative overflow-hidden">

                    {/* Featured Image */}
                    {coverImageUrl && (
                        <div className="mb-16 -mx-8 md:-mx-16 -mt-8 md:-mt-16 relative aspect-video overflow-hidden">
                            <img
                                src={coverImageUrl}
                                alt={article.title}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        </div>
                    )}

                    <div className="prose prose-xl prose-slate max-w-none prose-headings:font-black prose-headings:font-heading prose-p:leading-relaxed prose-p:text-gray-600 prose-strong:text-primary prose-a:text-accent">
                        <BlockRenderer blocks={article.content} />
                    </div>

                    {/* Share & tags */}
                    <div className="mt-20 pt-12 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Tags:</span>
                            <div className="flex gap-2">
                                {(article.seoKeywords ? article.seoKeywords.split(',').map((k: string) => k.trim()) : (article.category?.name ? [article.category.name] : ["ข่าวสาร"])).map((tag: string) => (
                                    <span key={tag} className="px-3 py-1 bg-gray-50 text-gray-500 rounded-lg text-[10px] font-bold whitespace-nowrap overflow-hidden text-ellipsis">#{tag}</span>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <PrintButton label="พิมพ์" />
                            <p className="text-sm font-bold text-primary">แชร์บทความนี้</p>
                            <ShareButton
                                title={article.title}
                                description={article.description || article.seoDescription || undefined}
                            />
                        </div>
                    </div>
                </article>

                {/* Next/Prev Navigation UI */}
                <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {prevArticle ? (
                        <Link href={`/news/${prevArticle.slug}`} className="block p-8 rounded-[2rem] bg-white border border-gray-100 transition-all cursor-pointer group" style={{ ["--hover-border" as any]: "var(--accent-subtle)" }}>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <ArrowLeft size={12} /> ข่าวก่อนหน้า
                            </p>
                            <h4 className="font-bold text-primary group-hover:text-accent transition-colors line-clamp-2">{prevArticle.title}</h4>
                        </Link>
                    ) : <div />}

                    {nextArticle ? (
                        <Link href={`/news/${nextArticle.slug}`} className="block p-8 rounded-[2rem] bg-white border border-gray-100 transition-all cursor-pointer group text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center justify-end gap-2">
                                ข่าวถัดไป <ChevronRight size={12} />
                            </p>
                            <h4 className="font-bold text-primary group-hover:text-accent transition-colors line-clamp-2">{nextArticle.title}</h4>
                        </Link>
                    ) : <div />}
                </div>
            </div>

            <NewsletterSection domain={domain} />

            <Footer domain={domain} />
        </main>
    );
}
