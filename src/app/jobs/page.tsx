import { prisma } from "@/shared/lib/prisma";
import {
    getStartOfMonth,
    getStartOfFiscalYear,
    getEndOfFiscalYear,
} from "@/shared/lib/date";
import { JobCard } from "@/features/jobs/job-card";
import { CreateJobDialog } from "@/features/jobs/create-job-dialog";
import { Briefcase } from "lucide-react";

/**
 * バイト管理画面
 * バイト先ごとの設定と収入実績を表示する
 */
export default async function JobsPage() {
    const jobs = await prisma.job.findMany({
        include: {
            _count: { select: { shifts: true } },
            shifts: {
                where: { entryStatus: "COMPLETED" },
                include: { entry: { include: { expenses: true } } },
                orderBy: { startTime: "desc" },
            },
        },
        orderBy: { createdAt: "asc" },
    });

    const startOfMonth = getStartOfMonth();
    const fiscalStart = getStartOfFiscalYear();
    const fiscalEnd = getEndOfFiscalYear();

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

    const jobStats = jobs.map((job) => {
        const completedShifts = job.shifts.filter((s) => s.entry);

        const monthlyTotal = completedShifts
            .filter((s) => s.startTime >= startOfMonth)
            .reduce((sum, s) => sum + calcEntryTotal(s.entry!), 0);

        const yearlyTotal = completedShifts
            .filter(
                (s) => s.startTime >= fiscalStart && s.startTime < fiscalEnd
            )
            .reduce((sum, s) => sum + calcEntryTotal(s.entry!), 0);

        const totalWorkMinutes = completedShifts.reduce(
            (sum, s) => sum + (s.entry!.workMinutes ?? 0),
            0
        );

        return {
            ...job,
            monthlyTotal,
            yearlyTotal,
            completedCount: completedShifts.length,
            totalWorkMinutes,
        };
    });

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Briefcase className="h-6 w-6 text-muted-foreground" />
                    <h1 className="text-2xl font-bold tracking-tight">
                        バイト管理
                    </h1>
                </div>
                <CreateJobDialog />
            </div>

            {jobStats.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                    バイト先が登録されていません。カレンダーを同期するか、手動で追加してください。
                </div>
            ) : (
                <div className="space-y-6">
                    {jobStats.map((job) => (
                        <JobCard
                            key={job.id}
                            jobId={job.id}
                            name={job.name}
                            hourlyWage={job.hourlyWage}
                            defaultTransportFee={job.defaultTransportFee}
                            isOneTime={job.isOneTime}
                            description={job.description}
                            monthlyTotal={job.monthlyTotal}
                            yearlyTotal={job.yearlyTotal}
                            completedCount={job.completedCount}
                            totalShifts={job._count.shifts}
                            totalWorkMinutes={job.totalWorkMinutes}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
