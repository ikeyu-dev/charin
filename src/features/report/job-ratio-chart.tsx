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
        data.map((item) => [
            item.name,
            {
                label: item.name,
                color: item.fill,
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
