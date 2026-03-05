import { formatCurrency } from "@/shared/lib/format";
import { AlertTriangle } from "lucide-react";

/** 年収の壁の定義 */
const INCOME_WALLS = [
    { amount: 1_030_000, label: "103万円の壁" },
    { amount: 1_300_000, label: "130万円の壁" },
    { amount: 1_600_000, label: "160万円の壁" },
    { amount: 1_780_000, label: "178万円の壁" },
] as const;

/** 警告レベルの閾値（壁の金額に対する割合） */
const WARNING_THRESHOLD = 0.9;

interface IncomeWallAlertProps {
    /** 年間収入 */
    yearlyIncome: number;
}

/**
 * 年収の壁に対するアラートを表示する
 * 壁の90%以上で黄色警告、超過で赤アラートを出す
 */
export function IncomeWallAlert({ yearlyIncome }: IncomeWallAlertProps) {
    if (yearlyIncome === 0) return null;

    const alerts = INCOME_WALLS.map((wall) => {
        const ratio = yearlyIncome / wall.amount;
        const remaining = wall.amount - yearlyIncome;

        if (ratio >= 1) {
            return { ...wall, level: "exceeded" as const, remaining };
        }
        if (ratio >= WARNING_THRESHOLD) {
            return { ...wall, level: "warning" as const, remaining };
        }
        return null;
    }).filter(Boolean);

    // まだどの壁にも近づいていない場合、次の壁までの残り金額を表示
    const nextWall = INCOME_WALLS.find((w) => yearlyIncome < w.amount);

    if (alerts.length === 0 && nextWall) {
        return (
            <div className="rounded-lg border border-muted bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                <p>
                    次の壁: {nextWall.label}（あと &yen;
                    {formatCurrency(nextWall.amount - yearlyIncome)}）
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {alerts.map((alert) => {
                if (!alert) return null;
                const isExceeded = alert.level === "exceeded";
                return (
                    <div
                        key={alert.amount}
                        className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
                            isExceeded
                                ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
                                : "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200"
                        }`}
                    >
                        <AlertTriangle
                            className={`mt-0.5 h-4 w-4 shrink-0 ${
                                isExceeded
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-yellow-600 dark:text-yellow-400"
                            }`}
                        />
                        <div>
                            <p className="font-medium">{alert.label}</p>
                            <p className="mt-0.5 opacity-80">
                                {isExceeded
                                    ? `&yen;${formatCurrency(Math.abs(alert.remaining))} 超過しています`
                                    : `あと &yen;${formatCurrency(alert.remaining)} で到達します`}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
