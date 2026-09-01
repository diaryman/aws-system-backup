import { Loader2 } from "lucide-react";

export default function NewsLoading() {
    return (
        <div className="w-full max-w-[1440px] mx-auto px-4 lg:px-8 py-16">
            <div className="flex items-center justify-between mb-8">
                <div className="h-10 w-64 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse"></div>
                <div className="h-10 w-48 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="rounded-3xl border border-gray-100 dark:border-white/10 overflow-hidden bg-white dark:bg-gray-900/50 flex flex-col animate-pulse">
                        <div className="h-56 bg-gray-100 dark:bg-gray-800 w-full relative">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        </div>
                        <div className="p-6 flex flex-col gap-4">
                            <div className="h-4 w-1/4 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                            <div className="space-y-2">
                                <div className="h-6 w-full bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                                <div className="h-6 w-5/6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                            </div>
                            <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full mt-4"></div>
                            <div className="flex items-center gap-3 mt-4">
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
