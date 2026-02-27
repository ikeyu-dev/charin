/**
 * 金額を日本円フォーマットに変換する
 * @param amount - 金額（円）
 * @returns フォーマットされた金額文字列（例: "1,050"）
 */
export function formatCurrency(amount: number): string {
    return amount.toLocaleString("ja-JP");
}

/**
 * 分数を「X時間Y分」形式に変換する
 * @param minutes - 分数
 * @returns フォーマットされた時間文字列
 */
export function formatMinutesToHours(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours}時間`;
    if (hours === 0) return `${mins}分`;
    return `${hours}時間${mins}分`;
}
