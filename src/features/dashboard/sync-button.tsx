"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { syncCalendarEvents } from "@/actions/sync";

/**
 * カレンダーイベントの同期ボタン
 * GASからカレンダー予定を取得してDBに同期する
 */
export function SyncButton() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const router = useRouter();

    const handleSync = async () => {
        setLoading(true);
        setMessage(null);

        const result = await syncCalendarEvents();

        if (result.success) {
            const parts = [
                `${result.created}件追加`,
                `${result.updated}件更新`,
                `${result.deleted}件削除`,
            ];
            if (result.freeeEntries) {
                parts.push(`freee ${result.freeeEntries}件自動入力`);
            }
            setMessage(`同期完了: ${parts.join("、")}`);
            router.refresh();
        } else {
            setMessage(`同期失敗: ${result.error}`);
        }

        setLoading(false);
    };

    return (
        <div className="flex items-center gap-3">
            {message && (
                <span className="text-sm text-muted-foreground">{message}</span>
            )}
            <Button
                onClick={handleSync}
                disabled={loading}
                variant="outline"
            >
                {loading ? "同期中..." : "カレンダーと同期"}
            </Button>
        </div>
    );
}
