import { prisma } from "@/shared/lib/prisma";
import { formatCurrency } from "@/shared/lib/format";
import {
    formatDateShort,
    formatTime,
    getStartOfFiscalYear,
    getEndOfFiscalYear,
} from "@/shared/lib/date";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { SyncButton } from "@/features/dashboard/sync-button";
import { MonthNavigator } from "@/features/dashboard/month-navigator";
import Link from "next/link";

/** シフトを年月ごとにグループ化する */
function groupShiftsByMonth<T extends { startTime: Date }>(shifts: T[]) {
    const groups = new Map<string, { label: string; shifts: T[] }>();
    for (const shift of shifts) {
        const y = shift.startTime.getFullYear();
        const m = shift.startTime.getMonth() + 1;
        const key = `${y}-${String(m).padStart(2, "0")}`;
        if (!groups.has(key)) {
            groups.set(key, { label: `${y}年${m}月`, shifts: [] });
        }
        groups.get(key)!.shifts.push(shift);
    }
    return [...groups.values()];
}

/**
 * ダッシュボード画面
 * 未入力一覧と収入サマリーを表示する
 */
export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ y?: string; m?: string }>;
}) {
    const params = await searchParams;
    const now = new Date();
    const selectedYear = params.y ? parseInt(params.y, 10) : now.getFullYear();
    const selectedMonth = params.m
        ? parseInt(params.m, 10) - 1
        : now.getMonth();

    const pendingShifts = await prisma.shift.findMany({
        where: { entryStatus: "PENDING" },
        include: { job: true },
        orderBy: { startTime: "desc" },
    });

    const selectedMonthStart = new Date(selectedYear, selectedMonth, 1);
    const selectedMonthEnd = new Date(selectedYear, selectedMonth + 1, 1);
    const completedSelectedMonth = await prisma.shift.findMany({
        where: {
            entryStatus: "COMPLETED",
            startTime: { gte: selectedMonthStart, lt: selectedMonthEnd },
        },
        include: { job: true, entry: { include: { expenses: true } } },
    });

    const fiscalStart = getStartOfFiscalYear();
    const fiscalEnd = getEndOfFiscalYear();
    const completedFiscal = await prisma.shift.findMany({
        where: {
            entryStatus: "COMPLETED",
            startTime: { gte: fiscalStart, lt: fiscalEnd },
        },
        include: { job: true, entry: { include: { expenses: true } } },
    });

    /** エントリーの合計金額 */
    const calcEntryTotal = (entry: {
        income: number | null;
        transportFee: number | null;
        expenses: { amount: number }[];
    }) => {
        const expensesTotal = entry.expenses.reduce(
            (sum, e) => sum + e.amount,
            0
        );
        return (entry.income ?? 0) + (entry.transportFee ?? 0) + expensesTotal;
    };

    const monthlyIncome = completedSelectedMonth.reduce((sum, shift) => {
        if (!shift.entry) return sum;
        return sum + calcEntryTotal(shift.entry);
    }, 0);

    const yearlyIncome = completedFiscal.reduce((sum, shift) => {
        if (!shift.entry) return sum;
        return sum + calcEntryTotal(shift.entry);
    }, 0);

    const incomeByJob = completedSelectedMonth.reduce(
        (acc, shift) => {
            if (!shift.entry) return acc;
            const jobName = shift.job.name;
            acc[jobName] = (acc[jobName] ?? 0) + calcEntryTotal(shift.entry);
            return acc;
        },
        {} as Record<string, number>
    );

    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pastShiftsCount = await prisma.shift.count({
        where: { startTime: { lt: tomorrow } },
    });
    const pastCompletedCount = await prisma.shift.count({
        where: { entryStatus: "COMPLETED", startTime: { lt: tomorrow } },
    });
    const progressPercent =
        pastShiftsCount > 0
            ? Math.round((pastCompletedCount / pastShiftsCount) * 100)
            : 0;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">
                    ダッシュボード
                </h1>
                <SyncButton />
            </div>

            {/* 収入カード群 */}
            <div className="grid gap-4 lg:grid-cols-3">
                {/* 月別収入 */}
                <div className="rounded-xl border p-6">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                            月別収入
                        </p>
                        <MonthNavigator
                            year={selectedYear}
                            month={selectedMonth}
                        />
                    </div>
                    <p className="mt-2 text-3xl font-bold tabular-nums">
                        &yen;{formatCurrency(monthlyIncome)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {(() => {
                            const payDate = new Date(
                                selectedYear,
                                selectedMonth + 1,
                                1
                            );
                            return `${payDate.getFullYear()}年${payDate.getMonth() + 1}月入金`;
                        })()}
                    </p>
                </div>

                {/* 年間収入 */}
                <div className="rounded-xl border p-6">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <p className="cursor-help text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                年間収入
                            </p>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>
                                {new Date().getFullYear() - 1}年12月 ~{" "}
                                {new Date().getFullYear()}年11月の勤務分
                            </p>
                        </TooltipContent>
                    </Tooltip>
                    <p className="mt-2 text-3xl font-bold tabular-nums">
                        &yen;{formatCurrency(yearlyIncome)}
                    </p>
                    <div className="mt-4">
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                            <span>入力進捗</span>
                            <span>
                                {pastCompletedCount} / {pastShiftsCount}
                            </span>
                        </div>
                        <Progress value={progressPercent} />
                    </div>
                </div>

                {/* バイト先別（今月） */}
                {Object.entries(incomeByJob).map(([jobName, income]) => (
                    <div
                        key={jobName}
                        className="rounded-xl border p-6"
                    >
                        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                            {jobName}
                        </p>
                        <p className="mt-2 text-2xl font-semibold tabular-nums">
                            &yen;{formatCurrency(income)}
                        </p>
                    </div>
                ))}
            </div>

            {/* 未入力の予定 */}
            <section>
                <div className="mb-4 flex items-center gap-3">
                    <h2 className="text-lg font-semibold">未入力の予定</h2>
                    {pendingShifts.length > 0 && (
                        <Badge variant="destructive">
                            {pendingShifts.length}
                        </Badge>
                    )}
                </div>
                {pendingShifts.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                        未入力の予定はありません
                    </div>
                ) : (
                    <div className="space-y-6">
                        {groupShiftsByMonth(pendingShifts).map(
                            ({ label, shifts }) => (
                                <div key={label}>
                                    <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                                        {label}
                                        <span className="ml-2">
                                            ({shifts.length}件)
                                        </span>
                                    </h3>
                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                        {shifts.map((shift) => (
                                            <Link
                                                key={shift.id}
                                                href={`/entry/${shift.id}`}
                                                className="group flex items-center justify-between rounded-xl border px-5 py-4 transition-colors hover:border-primary/30 hover:bg-muted/50"
                                            >
                                                <div>
                                                    <p className="font-semibold">
                                                        {shift.job.name}
                                                    </p>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        {formatDateShort(
                                                            shift.startTime
                                                        )}{" "}
                                                        {formatTime(
                                                            shift.startTime
                                                        )}
                                                        {" - "}
                                                        {formatTime(
                                                            shift.endTime
                                                        )}
                                                    </p>
                                                </div>
                                                <span className="shrink-0 text-sm text-muted-foreground transition-colors group-hover:text-primary">
                                                    入力する
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}
