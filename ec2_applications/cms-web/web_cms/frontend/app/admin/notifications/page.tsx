import { Suspense } from "react";
import NotificationsClient from "./NotificationsClient";
import { getAuditLogs } from "@/app/actions/auditLog";

export default async function AdminNotificationsPage(props: { searchParams: Promise<{ site?: string }> }) {
    const searchParams = await props.searchParams;
    const siteParam = searchParams.site || "main";
    const domain = siteParam === "pdpa" ? "pdpa.localhost" : "localhost";

    const auditLogs = await getAuditLogs(domain);

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <NotificationsClient
                initialNotifications={auditLogs}
                siteParam={siteParam}
                domain={domain}
            />
        </Suspense>
    );
}
