"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
    type ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
} from "@/components/ui/chart";

interface MonthlyIncomeChartProps {
    data: Record<string, string | number>[];
    jobNames: string[];
    jobColors: Record<string, string>;
}

/**
 * 直近数ヶ月の月別収入推移をバイト先別積み上げ棒グラフで表示する
 */
export function MonthlyIncomeChart({
    data,
    jobNames,
    jobColors,
}: MonthlyIncomeChartProps) {
    if (data.length === 0) return null;

    const chartConfig = Object.fromEntries(
        jobNames.map((name) => [
            name,
            {
                label: name,
                color: jobColors[name],
            },
        ])
    ) satisfies ChartConfig;

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
                    content={
                        <ChartTooltipContent
                            formatter={(value) =>
                                `¥${Number(value).toLocaleString()}`
                            }
                        />
                    }
                />
                <ChartLegend content={<ChartLegendContent />} />
                {jobNames.map((name, i) => (
                    <Bar
                        key={name}
                        dataKey={name}
                        stackId="income"
                        fill={jobColors[name]}
                        radius={
                            i === jobNames.length - 1
                                ? [4, 4, 0, 0]
                                : [0, 0, 0, 0]
                        }
                    />
                ))}
            </BarChart>
        </ChartContainer>
    );
}
