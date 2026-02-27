"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
    type ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";

interface MonthlyIncomeData {
    month: string;
    income: number;
}

interface MonthlyIncomeChartProps {
    data: MonthlyIncomeData[];
}

const chartConfig = {
    income: {
        label: "収入",
        color: "var(--chart-1)",
    },
} satisfies ChartConfig;

/**
 * 直近数ヶ月の月別収入推移を棒グラフで表示する
 */
export function MonthlyIncomeChart({ data }: MonthlyIncomeChartProps) {
    if (data.length === 0) return null;

    return (
        <ChartContainer
            config={chartConfig}
            className="min-h-[200px] w-full"
        >
            <BarChart
                accessibilityLayer
                data={data}
            >
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                />
                <ChartTooltip
                    cursor={false}
                    content={
                        <ChartTooltipContent
                            formatter={(value) =>
                                `¥${Number(value).toLocaleString()}`
                            }
                        />
                    }
                />
                <Bar
                    dataKey="income"
                    fill="var(--color-income)"
                    radius={[4, 4, 0, 0]}
                />
            </BarChart>
        </ChartContainer>
    );
}
