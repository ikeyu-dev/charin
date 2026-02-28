"use client";

import { Pie, PieChart } from "recharts";
import {
    type ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
} from "@/components/ui/chart";

interface JobBreakdownData {
    name: string;
    income: number;
    fill: string;
}

interface JobBreakdownChartProps {
    data: JobBreakdownData[];
}

const CHART_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
];

/**
 * バイト先別の収入内訳を円グラフで表示する
 */
export function JobBreakdownChart({ data }: JobBreakdownChartProps) {
    if (data.length === 0) return null;

    const chartConfig = Object.fromEntries(
        data.map((item, i) => [
            item.name,
            {
                label: item.name,
                color: CHART_COLORS[i % CHART_COLORS.length],
            },
        ])
    ) satisfies ChartConfig;

    return (
        <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square min-h-[200px] max-h-[300px]"
        >
            <PieChart>
                <ChartTooltip
                    content={
                        <ChartTooltipContent
                            formatter={(value) =>
                                `¥${Number(value).toLocaleString()}`
                            }
                        />
                    }
                />
                <Pie
                    data={data}
                    dataKey="income"
                    nameKey="name"
                    innerRadius={50}
                    strokeWidth={2}
                />
                <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </PieChart>
        </ChartContainer>
    );
}
