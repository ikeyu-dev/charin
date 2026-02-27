import { prisma } from "@/shared/lib/prisma";
import { formatCurrency } from "@/shared/lib/format";
import { getStartOfFiscalYear, getEndOfFiscalYear } from "@/shared/lib/date";
import {
    Card,
    CardContent,
    CardHeader,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { YearlyChart } from "@/features/report/yearly-chart";
import { JobRatioChart } from "@/features/report/job-ratio-chart";
import { Coins, Briefcase } from "lucide-react";

/** 年度内の月を12月始まりの順序で並べる（12, 1, 2, ..., 11） */
const FISCAL_MONTHS = [11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const MONTH_NAMES = [
    "1月",
    "2月",
    "3月",
    "4月",
    "5月",
    "6月",
    "7月",
    "8月",
    "9月",
    "10月",
    "11月",
    "12月",
] as const;

const CHART_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
];

/**
 * 収入レポート画面
 * 前年12月~今年11月の勤務分を年間収入として月別・バイト先別に集計する
 */
export default async function ReportPage() {
    const currentYear = new Date().getFullYear();
    const fiscalStart = getStartOfFiscalYear();
    const fiscalEnd = getEndOfFiscalYear();

    const shifts = await prisma.shift.findMany({
        where: {
            entryStatus: "COMPLETED",
            startTime: { gte: fiscalStart, lt: fiscalEnd },
        },
        include: { job: true, entry: { include: { expenses: true } } },
        orderBy: { startTime: "asc" },
    });

    /** "YYYY-MM" をキーにして月別集計する */
    const monthlyData: Record<string, Record<string, number>> = {};
    let yearTotal = 0;
    const jobTotals: Record<string, number> = {};

    for (const shift of shifts) {
        if (!shift.entry) continue;
        const expensesTotal = shift.entry.expenses.reduce(
            (sum, e) => sum + e.amount,
            0
        );
        const total =
            (shift.entry.income ?? 0) +
            (shift.entry.transportFee ?? 0) +
            expensesTotal;

        const key = `${shift.startTime.getFullYear()}-${shift.startTime.getMonth()}`;
        if (!monthlyData[key]) {
            monthlyData[key] = {};
        }
        monthlyData[key][shift.job.name] =
            (monthlyData[key][shift.job.name] ?? 0) + total;
        jobTotals[shift.job.name] = (jobTotals[shift.job.name] ?? 0) + total;
        yearTotal += total;
    }

    const jobNames = [...new Set(shifts.map((s) => s.job.name))].sort();

    /** 年度内の各月のキーと表示ラベルを生成する */
    const fiscalMonthEntries = FISCAL_MONTHS.map((month) => {
        const year = month === 11 ? currentYear - 1 : currentYear;
        const key = `${year}-${month}`;
        const label = `${MONTH_NAMES[month]}`;
        return { key, label };
    });

    // 年間月別推移グラフ用データ
    const yearlyChartData = fiscalMonthEntries
        .filter(({ key }) => monthlyData[key])
        .map(({ key, label }) => {
            const row: Record<string, string | number> = { month: label };
            for (const name of jobNames) {
                row[name] = monthlyData[key][name] ?? 0;
            }
            return row;
        });

    // バイト先別構成比グラフ用データ
    const jobRatioData = Object.entries(jobTotals).map(
        ([name, total], i) => ({
            name,
            total,
            fill: CHART_COLORS[i % CHART_COLORS.length],
        })
    );

    return (
        <div className="space-y-10">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    {currentYear}年 収入レポート
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {currentYear - 1}年12月 ~ {currentYear}年11月の勤務分
                </p>
            </div>

            {/* 年間サマリー */}
            <section>
                <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    年間合計
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Card className="transition-shadow hover:shadow-md">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Coins className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                    合計
                                </p>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold tabular-nums">
                                &yen;{formatCurrency(yearTotal)}
                            </p>
                        </CardContent>
                    </Card>
                    {Object.entries(jobTotals).map(([name, total]) => (
                        <Card
                            key={name}
                            className="transition-shadow hover:shadow-md"
                        >
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">
                                        {name}
                                    </p>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-semibold tabular-nums">
                                    &yen;{formatCurrency(total)}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            {/* グラフ群 */}
            {jobNames.length > 0 && (
                <section>
                    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
                        <Card>
                            <CardHeader>
                                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                    月別推移
                                </p>
                            </CardHeader>
                            <CardContent>
                                <YearlyChart
                                    data={yearlyChartData}
                                    jobNames={jobNames}
                                />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                    バイト先別構成比
                                </p>
                            </CardHeader>
                            <CardContent>
                                <JobRatioChart data={jobRatioData} />
                            </CardContent>
                        </Card>
                    </div>
                </section>
            )}

            {/* 月別テーブル */}
            {jobNames.length === 0 ? (
                <p className="text-muted-foreground">
                    入力済みのデータがありません
                </p>
            ) : (
                <section>
                    <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                        月別内訳
                    </h2>
                    <div className="rounded-xl border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-20">月</TableHead>
                                    {jobNames.map((name) => (
                                        <TableHead
                                            key={name}
                                            className="text-right"
                                        >
                                            {name}
                                        </TableHead>
                                    ))}
                                    <TableHead className="text-right">
                                        合計
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fiscalMonthEntries
                                    .filter(({ key }) => monthlyData[key])
                                    .map(({ key, label }) => {
                                        const monthTotal = Object.values(
                                            monthlyData[key]
                                        ).reduce((sum, v) => sum + v, 0);
                                        return (
                                            <TableRow key={key}>
                                                <TableCell className="font-medium">
                                                    {label}
                                                </TableCell>
                                                {jobNames.map((name) => (
                                                    <TableCell
                                                        key={name}
                                                        className="text-right tabular-nums"
                                                    >
                                                        {monthlyData[key][name]
                                                            ? `¥${formatCurrency(monthlyData[key][name])}`
                                                            : "-"}
                                                    </TableCell>
                                                ))}
                                                <TableCell className="text-right tabular-nums font-semibold">
                                                    &yen;
                                                    {formatCurrency(monthTotal)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell className="font-semibold">
                                        合計
                                    </TableCell>
                                    {jobNames.map((name) => (
                                        <TableCell
                                            key={name}
                                            className="text-right tabular-nums font-semibold"
                                        >
                                            &yen;
                                            {formatCurrency(
                                                jobTotals[name] ?? 0
                                            )}
                                        </TableCell>
                                    ))}
                                    <TableCell className="text-right tabular-nums font-bold">
                                        &yen;{formatCurrency(yearTotal)}
                                    </TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                </section>
            )}
        </div>
    );
}
