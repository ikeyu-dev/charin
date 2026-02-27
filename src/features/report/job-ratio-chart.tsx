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

const CHART_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
];

interface JobRatioData {
    name: string;
    total: number;
    fill: string;
}

interface JobRatioChartProps {
    data: JobRatioData[];
}

/**
 * バイト先別の年間構成比を円グラフで表示する
 */
export function JobRatioChart({ data }: JobRatioChartProps) {
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
                    dataKey="total"
                    nameKey="name"
                    innerRadius={50}
                    strokeWidth={2}
                />
                <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </PieChart>
        </ChartContainer>
    );
}
