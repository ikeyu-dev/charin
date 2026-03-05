import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/shared/lib/format";
import { Target } from "lucide-react";

interface GoalProgressProps {
    /** 月間収入 */
    monthlyIncome: number;
    /** 年間収入 */
    yearlyIncome: number;
    /** 月間目標 */
    monthlyTarget: number | null;
    /** 年間目標 */
    yearlyTarget: number | null;
}

/**
 * 目標金額に対する達成率をプログレスバーで表示する
 */
export function GoalProgress({
    monthlyIncome,
    yearlyIncome,
    monthlyTarget,
    yearlyTarget,
}: GoalProgressProps) {
    if (!monthlyTarget && !yearlyTarget) return null;

    const monthlyPercent = monthlyTarget
        ? Math.round((monthlyIncome / monthlyTarget) * 100)
        : null;
    const yearlyPercent = yearlyTarget
        ? Math.round((yearlyIncome / yearlyTarget) * 100)
        : null;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                        目標達成率
                    </p>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {monthlyTarget != null && monthlyPercent != null && (
                    <div>
                        <div className="mb-1 flex justify-between text-sm">
                            <span>
                                月間目標: &yen;
                                {formatCurrency(monthlyTarget)}
                            </span>
                            <span className="font-medium tabular-nums">
                                {monthlyPercent}%
                            </span>
                        </div>
                        <Progress value={Math.min(monthlyPercent, 100)} />
                        <p className="mt-1 text-xs text-muted-foreground">
                            &yen;{formatCurrency(monthlyIncome)} / &yen;
                            {formatCurrency(monthlyTarget)}
                            {monthlyPercent >= 100 && (
                                <span className="ml-2 font-medium text-green-600">
                                    達成
                                </span>
                            )}
                        </p>
                    </div>
                )}
                {yearlyTarget != null && yearlyPercent != null && (
                    <div>
                        <div className="mb-1 flex justify-between text-sm">
                            <span>
                                年間目標: &yen;
                                {formatCurrency(yearlyTarget)}
                            </span>
                            <span className="font-medium tabular-nums">
                                {yearlyPercent}%
                            </span>
                        </div>
                        <Progress value={Math.min(yearlyPercent, 100)} />
                        <p className="mt-1 text-xs text-muted-foreground">
                            &yen;{formatCurrency(yearlyIncome)} / &yen;
                            {formatCurrency(yearlyTarget)}
                            {yearlyPercent >= 100 && (
                                <span className="ml-2 font-medium text-green-600">
                                    達成
                                </span>
                            )}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
