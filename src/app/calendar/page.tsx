import { prisma } from "@/shared/lib/prisma";
import { CalendarView } from "@/features/calendar/calendar-view";

/** シフトデータをClient Componentに渡すためのシリアライズ型 */
export interface CalendarShift {
    id: string;
    jobName: string;
    jobColor: string | null;
    startTime: string;
    endTime: string;
    entryStatus: string;
    clockIn: string | null;
    clockOut: string | null;
    breakStart: string | null;
    breakEnd: string | null;
    breakMinutes: number | null;
    workMinutes: number | null;
}

/**
 * カレンダーページ
 * 月間カレンダー形式で勤務実績を表示する
 */
export default async function CalendarPage({
    searchParams,
}: {
    searchParams: Promise<{ year?: string; month?: string }>;
}) {
    const params = await searchParams;
    const now = new Date();
    const year = params.year ? parseInt(params.year, 10) : now.getFullYear();
    const month = params.month
        ? parseInt(params.month, 10) - 1
        : now.getMonth();

    const startOfMonth = new Date(year, month, 1);
    const startOfNextMonth = new Date(year, month + 1, 1);

    const shifts = await prisma.shift.findMany({
        where: {
            startTime: { gte: startOfMonth, lt: startOfNextMonth },
        },
        include: { job: true, entry: true },
        orderBy: { startTime: "asc" },
    });

    const calendarShifts: CalendarShift[] = shifts.map((shift) => ({
        id: shift.id,
        jobName: shift.job.name,
        jobColor: shift.job.color,
        startTime: shift.startTime.toISOString(),
        endTime: shift.endTime.toISOString(),
        entryStatus: shift.entryStatus,
        clockIn: shift.entry?.clockIn ?? null,
        clockOut: shift.entry?.clockOut ?? null,
        breakStart: shift.entry?.breakStart ?? null,
        breakEnd: shift.entry?.breakEnd ?? null,
        breakMinutes: shift.entry?.breakMinutes ?? null,
        workMinutes: shift.entry?.workMinutes ?? null,
    }));

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">カレンダー</h1>
            <CalendarView
                year={year}
                month={month}
                shifts={calendarShifts}
            />
        </div>
    );
}
