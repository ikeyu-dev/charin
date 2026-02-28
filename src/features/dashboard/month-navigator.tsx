"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
                <ChevronLeft className="h-4 w-4" />
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
                <ChevronRight className="h-4 w-4" />
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
