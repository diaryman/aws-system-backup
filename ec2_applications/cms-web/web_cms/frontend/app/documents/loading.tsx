import { Loader2 } from "lucide-react";

export default function DocumentsLoading() {
    return (
        <div className="w-full max-w-[1024px] mx-auto px-4 lg:px-8 py-16">
            <div className="flex items-center justify-between mb-8">
                <div className="h-10 w-64 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse"></div>
                <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse"></div>
            </div>

            <div className="flex flex-col gap-4">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="rounded-xl border border-gray-100 dark:border-white/10 p-5 bg-white dark:bg-gray-900/50 flex items-center justify-between animate-pulse">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                                <div className="h-3 w-1/3 bg-gray-100 dark:bg-gray-800 rounded-full"></div>
                            </div>
                        </div>
                        <div className="w-24 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0 ml-4 hidden sm:block"></div>
                    </div>
                ))}
            </div>
        </div>
    );
}
