"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface MonthNavigatorProps {
    year: number;
    /** 0-11 */
    month: number;
}

/**
 * 月切り替えナビゲーション
 * 前月/次月ボタンと「今月」ボタンで表示月を変更する
 */
export function MonthNavigator({ year, month }: MonthNavigatorProps) {
    const router = useRouter();

    const navigate = (delta: number) => {
        const d = new Date(year, month + delta, 1);
        router.push(`/?y=${d.getFullYear()}&m=${d.getMonth() + 1}`);
    };

    const now = new Date();
    const isCurrentMonth =
        year === now.getFullYear() && month === now.getMonth();

    return (
        <div className="flex items-center gap-2">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="h-7 w-7 p-0"
            >
                &lt;
            </Button>
            <span className="min-w-[5rem] text-center text-xs font-medium text-muted-foreground tabular-nums">
                {year}年{month + 1}月
            </span>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(1)}
                className="h-7 w-7 p-0"
            >
                &gt;
            </Button>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/")}
                className="h-7 text-xs"
                disabled={isCurrentMonth}
            >
                今月
            </Button>
        </div>
    );
}
