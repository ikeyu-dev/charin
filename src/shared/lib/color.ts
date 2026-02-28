/** デフォルトのバイト先カラーパレット */
export const DEFAULT_JOB_COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#84cc16",
] as const;

/**
 * バイト先のカラーを取得する
 * DB に設定済みの色があればそれを返し、なければ名前のハッシュからデフォルト色を決定する
 */
export function getJobColor(name: string, color: string | null): string {
    if (color) return color;
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return DEFAULT_JOB_COLORS[Math.abs(hash) % DEFAULT_JOB_COLORS.length];
}
