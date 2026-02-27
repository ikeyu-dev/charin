import type { GasEventsResponse } from "@/shared/types/gas";

const GAS_API_URL = process.env.GAS_API_URL;

/**
 * GAS APIからカレンダーイベントを取得する（サーバーサイド専用）
 * @param year - 取得対象の年
 * @returns カレンダーイベント一覧
 * @throws GAS_API_URLが未設定、またはAPI呼び出し失敗時
 */
export async function fetchCalendarEvents(
    year?: number
): Promise<GasEventsResponse> {
    if (!GAS_API_URL) {
        throw new Error(
            "GAS_API_URL が設定されていません。.env ファイルを確認してください。"
        );
    }

    const params = new URLSearchParams({ path: "events" });
    if (year) {
        params.set("year", String(year));
    }

    const url = `${GAS_API_URL}?${params.toString()}`;
    const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        redirect: "follow",
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(
            `GAS API エラー: ${response.status} ${response.statusText}`
        );
    }

    return response.json() as Promise<GasEventsResponse>;
}
