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

const CHART_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
];

interface YearlyChartProps {
    data: Record<string, string | number>[];
    jobNames: string[];
}

/**
 * 年間月別推移を積み上げ棒グラフで表示する
 */
export function YearlyChart({ data, jobNames }: YearlyChartProps) {
    if (data.length === 0) return null;

    const chartConfig = Object.fromEntries(
        jobNames.map((name, i) => [
            name,
            {
                label: name,
                color: CHART_COLORS[i % CHART_COLORS.length],
            },
        ])
    ) satisfies ChartConfig;

    return (
        <ChartContainer
            config={chartConfig}
            className="min-h-[300px] w-full"
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
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
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
