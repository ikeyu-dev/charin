/**
 * Next.js Instrumentation
 * サーバー起動時にカレンダー同期のスケジューラを登録する
 */
export async function onRequestInit() {
    // サーバー起動時に一度だけ実行される
}

export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        const cron = await import("node-cron");
        const { syncCalendarEvents } = await import("@/actions/sync");

        const runSync = async (label: string) => {
            console.log(
                `[${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}] ${label}を開始`
            );
            const result = await syncCalendarEvents();
            if (result.success) {
                console.log(
                    `[${label}] 完了: ${result.created}件追加、${result.updated}件更新`
                );
            } else {
                console.error(`[${label}] 失敗: ${result.error}`);
            }
        };

        // 起動時に同期を実行
        runSync("起動時同期");

        // 毎日20:00にカレンダー同期を実行
        cron.default.schedule("0 20 * * *", () => runSync("定期同期"));

        console.log("[スケジューラ] 毎日20:00のカレンダー同期を登録しました");
    }
}
