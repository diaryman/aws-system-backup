"use server";

import { fetchAPI } from "@/lib/api";
import { revalidatePath } from "next/cache";

export async function getAuditLogs(domain: string) {
    try {
        const res = await fetchAPI("/audit-logs", {
            filters: { domain },
            sort: ["createdAt:desc"],
            pagination: { pageSize: 50 },
        }, { revalidate: false });
        return res?.data || [];
    } catch (e) {
        console.error("Failed to fetch audit logs:", e);
        return [];
    }
}

export async function markAuditLogAsRead(documentId: string, domain: string) {
    try {
        await fetchAPI(`/audit-logs/${documentId}`, undefined, {
            method: "PUT",
            body: JSON.stringify({ data: { isRead: true } }),
        });
        revalidatePath(`/admin/notifications`);
        return { success: true };
    } catch (err) {
        console.error("Error marking audit log as read:", err);
        return { success: false };
    }
}

export async function markAllAuditLogsAsRead(domain: string) {
    // Strapi REST API doesn't support bulk update easily.
    // We would fetch unread logs first, and update them one by one.
    try {
        const unread = await fetchAPI("/audit-logs", {
            filters: { domain, isRead: false },
            pagination: { pageSize: 50 }
        });
        if (unread?.data && unread.data.length > 0) {
            await Promise.all(
                unread.data.map((log: any) =>
                    fetchAPI(`/audit-logs/${log.documentId}`, undefined, {
                        method: "PUT",
                        body: JSON.stringify({ data: { isRead: true } }),
                    })
                )
            );
        }
        revalidatePath(`/admin/notifications`);
        return { success: true };
    } catch (err) {
        console.error("Error marking all audit logs as read:", err);
        return { success: false };
    }
}

export async function deleteAuditLog(documentId: string, domain: string) {
    try {
        await fetchAPI(`/audit-logs/${documentId}`, undefined, {
            method: "DELETE",
        });
        revalidatePath(`/admin/notifications`);
        return { success: true };
    } catch (err) {
        console.error("Error deleting audit log:", err);
        return { success: false };
    }
}
