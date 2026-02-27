"use server";

import { prisma } from "@/shared/lib/prisma";
import { entrySchema, type EntryInput } from "@/shared/lib/validation";
import {
    calcWorkMinutes,
    calcLateNightMinutes,
    calcIncomeWithLateNight,
    timeToMinutes,
} from "@/shared/lib/date";
import { revalidatePath } from "next/cache";

interface EntryResult {
    success: boolean;
    error?: string;
}

/**
 * 勤務時間または収入を登録する（交通費・経費込み）
 * @param input - 入力データ（勤務時間 or 収入直接入力 + 交通費 + 経費）
 * @returns 処理結果
 */
export async function createEntry(input: EntryInput): Promise<EntryResult> {
    const parsed = entrySchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues.map((i) => i.message).join(", "),
        };
    }

    const data = parsed.data;

    try {
        const shift = await prisma.shift.findUnique({
            where: { id: data.shiftId },
            include: { job: true },
        });

        if (!shift) {
            return { success: false, error: "シフトが見つかりません" };
        }

        if (shift.entryStatus === "COMPLETED") {
            return { success: false, error: "既に入力済みです" };
        }

        let income: number | null = null;
        let workMinutes: number | null = null;
        let clockIn: string | null = null;
        let breakStart: string | null = null;
        let breakEnd: string | null = null;
        let clockOut: string | null = null;

        let breakMinutes: number | null = null;
        let lateNightMinutes: number | null = null;

        if (data.entryType === "HOURS") {
            clockIn = data.clockIn;
            breakStart = data.breakStart ?? null;
            breakEnd = data.breakEnd ?? null;
            clockOut = data.clockOut;

            if (data.breakMinutes != null) {
                breakMinutes = data.breakMinutes;
                workMinutes = Math.max(
                    0,
                    timeToMinutes(clockOut) -
                        timeToMinutes(clockIn) -
                        breakMinutes
                );
            } else {
                workMinutes = calcWorkMinutes(
                    clockIn,
                    clockOut,
                    breakStart ?? undefined,
                    breakEnd ?? undefined
                );
                if (breakStart && breakEnd) {
                    breakMinutes =
                        timeToMinutes(breakEnd) - timeToMinutes(breakStart);
                }
            }

            lateNightMinutes = calcLateNightMinutes(
                clockIn,
                clockOut,
                breakStart ?? undefined,
                breakEnd ?? undefined,
                breakMinutes ?? undefined
            );

            if (shift.job.hourlyWage) {
                income = calcIncomeWithLateNight(
                    workMinutes,
                    lateNightMinutes,
                    shift.job.hourlyWage
                );
            }
        } else {
            income = data.income;
        }

        const transportFee = data.transportFee ?? null;
        const expenses =
            data.expenses?.filter((e) => e.name && e.amount > 0) ?? [];

        await prisma.$transaction(async (tx) => {
            const entry = await tx.entry.create({
                data: {
                    shiftId: data.shiftId,
                    entryType: data.entryType,
                    clockIn,
                    breakStart,
                    breakEnd,
                    breakMinutes,
                    clockOut,
                    workMinutes,
                    lateNightMinutes,
                    income,
                    transportFee,
                    note: data.note ?? null,
                },
            });

            if (expenses.length > 0) {
                await tx.expense.createMany({
                    data: expenses.map((e) => ({
                        entryId: entry.id,
                        name: e.name,
                        amount: e.amount,
                    })),
                });
            }

            await tx.shift.update({
                where: { id: data.shiftId },
                data: { entryStatus: "COMPLETED" },
            });
        });

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : "不明なエラー";
        return { success: false, error: message };
    }
}

/**
 * 入力済みのエントリーを更新する（交通費・経費込み）
 * @param entryId - 更新対象のエントリーID
 * @param input - 入力データ（勤務時間 or 収入直接入力 + 交通費 + 経費）
 * @returns 処理結果
 */
export async function updateEntry(
    entryId: string,
    input: EntryInput
): Promise<EntryResult> {
    const parsed = entrySchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues.map((i) => i.message).join(", "),
        };
    }

    const data = parsed.data;

    try {
        const entry = await prisma.entry.findUnique({
            where: { id: entryId },
            include: { shift: { include: { job: true } } },
        });

        if (!entry) {
            return { success: false, error: "エントリーが見つかりません" };
        }

        let income: number | null = null;
        let workMinutes: number | null = null;
        let clockIn: string | null = null;
        let breakStart: string | null = null;
        let breakEnd: string | null = null;
        let clockOut: string | null = null;

        let breakMinutes: number | null = null;
        let lateNightMinutes: number | null = null;

        if (data.entryType === "HOURS") {
            clockIn = data.clockIn;
            breakStart = data.breakStart ?? null;
            breakEnd = data.breakEnd ?? null;
            clockOut = data.clockOut;

            if (data.breakMinutes != null) {
                breakMinutes = data.breakMinutes;
                workMinutes = Math.max(
                    0,
                    timeToMinutes(clockOut) -
                        timeToMinutes(clockIn) -
                        breakMinutes
                );
            } else {
                workMinutes = calcWorkMinutes(
                    clockIn,
                    clockOut,
                    breakStart ?? undefined,
                    breakEnd ?? undefined
                );
                if (breakStart && breakEnd) {
                    breakMinutes =
                        timeToMinutes(breakEnd) - timeToMinutes(breakStart);
                }
            }

            lateNightMinutes = calcLateNightMinutes(
                clockIn,
                clockOut,
                breakStart ?? undefined,
                breakEnd ?? undefined,
                breakMinutes ?? undefined
            );

            if (entry.shift.job.hourlyWage) {
                income = calcIncomeWithLateNight(
                    workMinutes,
                    lateNightMinutes,
                    entry.shift.job.hourlyWage
                );
            }
        } else {
            income = data.income;
        }

        const transportFee = data.transportFee ?? null;
        const expenses =
            data.expenses?.filter((e) => e.name && e.amount > 0) ?? [];

        await prisma.$transaction(async (tx) => {
            await tx.entry.update({
                where: { id: entryId },
                data: {
                    entryType: data.entryType,
                    clockIn,
                    breakStart,
                    breakEnd,
                    breakMinutes,
                    clockOut,
                    workMinutes,
                    lateNightMinutes,
                    income,
                    transportFee,
                    note: data.note ?? null,
                },
            });

            // 既存の経費を削除して再作成
            await tx.expense.deleteMany({
                where: { entryId },
            });

            if (expenses.length > 0) {
                await tx.expense.createMany({
                    data: expenses.map((e) => ({
                        entryId,
                        name: e.name,
                        amount: e.amount,
                    })),
                });
            }
        });

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : "不明なエラー";
        return { success: false, error: message };
    }
}

/**
 * 入力済みのエントリーを削除し、シフトを未入力状態に戻す
 * @param entryId - エントリーID
 * @returns 処理結果
 */
export async function deleteEntry(entryId: string): Promise<EntryResult> {
    try {
        const entry = await prisma.entry.findUnique({
            where: { id: entryId },
        });

        if (!entry) {
            return { success: false, error: "エントリーが見つかりません" };
        }

        await prisma.$transaction([
            prisma.entry.delete({ where: { id: entryId } }),
            prisma.shift.update({
                where: { id: entry.shiftId },
                data: { entryStatus: "PENDING" },
            }),
        ]);

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : "不明なエラー";
        return { success: false, error: message };
    }
}
