import { prisma } from "@/shared/lib/prisma";
import { formatDateShort, formatTime } from "@/shared/lib/date";
import { formatCurrency } from "@/shared/lib/format";
import { EntryForm } from "@/features/entry/entry-form";
import type { EntryInitialData } from "@/features/entry/entry-form";
import { EntryActions } from "@/features/entry/entry-actions";
import { BackButton } from "@/components/back-button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Briefcase, Calendar, Clock } from "lucide-react";
import { notFound } from "next/navigation";

interface EntryPageProps {
    params: Promise<{ shiftId: string }>;
    searchParams: Promise<{ edit?: string }>;
}

/**
 * 勤務時間/収入の入力・編集画面
 */
export default async function EntryPage({
    params,
    searchParams,
}: EntryPageProps) {
    const { shiftId } = await params;
    const { edit } = await searchParams;
    const isEditMode = edit === "true";

    const shift = await prisma.shift.findUnique({
        where: { id: shiftId },
        include: {
            job: true,
            entry: { include: { expenses: true } },
        },
    });

    if (!shift) {
        notFound();
    }

    const isCompleted = shift.entryStatus === "COMPLETED" && shift.entry;

    /** 編集モード用の初期データを構築する */
    const buildInitialData = (): EntryInitialData | undefined => {
        if (!isEditMode || !shift.entry) return undefined;
        return {
            entryId: shift.entry.id,
            entryType: shift.entry.entryType as "HOURS" | "INCOME",
            clockIn: shift.entry.clockIn,
            breakStart: shift.entry.breakStart,
            breakEnd: shift.entry.breakEnd,
            breakMinutes: shift.entry.breakMinutes,
            clockOut: shift.entry.clockOut,
            income: shift.entry.income,
            transportFee: shift.entry.transportFee,
            note: shift.entry.note,
            expenses: shift.entry.expenses.map((e) => ({
                name: e.name,
                amount: e.amount,
            })),
        };
    };

    return (
        <div className="mx-auto max-w-lg space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">
                    {isEditMode ? "勤務情報編集" : "勤務情報入力"}
                </h1>
                <BackButton />
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <p className="text-lg font-semibold">
                            {shift.job.name}
                        </p>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDateShort(shift.startTime)}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(shift.startTime)} -{" "}
                            {formatTime(shift.endTime)}
                        </span>
                    </div>
                    {shift.job.hourlyWage && (
                        <p className="mt-2 text-sm text-muted-foreground">
                            時給 &yen;{formatCurrency(shift.job.hourlyWage)}
                        </p>
                    )}
                </CardContent>
            </Card>

            {isCompleted && !isEditMode ? (
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm text-muted-foreground">
                            入力済み
                        </p>
                        <p className="mt-1 text-2xl font-bold tabular-nums">
                            &yen;{formatCurrency(shift.entry!.income ?? 0)}
                        </p>
                        <EntryActions
                            shiftId={shiftId}
                            entryId={shift.entry!.id}
                        />
                    </CardContent>
                </Card>
            ) : (
                <EntryForm
                    shiftId={shift.id}
                    hourlyWage={shift.job.hourlyWage}
                    defaultTransportFee={shift.job.defaultTransportFee}
                    initialData={buildInitialData()}
                />
            )}
        </div>
    );
}
