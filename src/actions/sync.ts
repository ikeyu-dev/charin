"use server";

import { prisma } from "@/shared/lib/prisma";
import { fetchCalendarEvents } from "@/shared/api/gas-server";
import {
    scrapeFreeeAttendance,
    type FreeeAttendanceRecord,
} from "@/shared/api/freee-scraper";
import {
    calcWorkMinutes,
    calcLateNightMinutes,
    calcIncomeWithLateNight,
    timeToMinutes,
} from "@/shared/lib/date";
import type { GasCalendarEvent } from "@/shared/types/gas";

interface SyncResult {
    success: boolean;
    created: number;
    updated: number;
    deleted: number;
    freeeEntries?: number;
    warnings?: string[];
    error?: string;
}

interface FreeeSyncResult {
    created: number;
    warnings: string[];
}

/**
 * GASからカレンダーイベントを取得し、SQLiteに同期する
 * @returns 同期結果（作成数、更新数）
 */
export async function syncCalendarEvents(): Promise<SyncResult> {
    try {
        const currentYear = new Date().getFullYear();
        const [thisYear, lastYear] = await Promise.all([
            fetchCalendarEvents(currentYear),
            fetchCalendarEvents(currentYear - 1),
        ]);
        let created = 0;
        let updated = 0;

        // 前年は12月分のみ対象（前年12月~今年11月が年間収入の範囲）
        const lastYearDec = lastYear.events.filter((e) => {
            const month = new Date(e.startTime).getMonth();
            return month === 11;
        });
        const allEvents = [...lastYearDec, ...thisYear.events];
        // calendarEventId + startTime で一意に識別（繰り返しイベント対応）
        const calendarKeys = new Set<string>();
        for (const event of allEvents) {
            const key = `${event.id}_${event.startTime}`;
            if (calendarKeys.has(key)) continue;
            calendarKeys.add(key);
            if (!event.jobName) continue;
            const result = await upsertShift(event);
            if (result === "created") created++;
            if (result === "updated") updated++;
        }

        // カレンダーから削除されたシフトをDBからも削除
        const syncRangeStart = new Date(currentYear - 1, 11, 1);
        const syncRangeEnd = new Date(currentYear + 1, 0, 1);
        const deleted = await deleteRemovedShifts(
            calendarKeys,
            syncRangeStart,
            syncRangeEnd
        );

        // freee勤怠データの自動入力
        let freeeEntries = 0;
        let warnings: string[] = [];
        const freeeResult = await syncFreeeAttendance();
        freeeEntries = freeeResult.created;
        warnings = freeeResult.warnings;

        return {
            success: true,
            created,
            updated,
            deleted,
            freeeEntries,
            warnings,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "不明なエラー";
        return {
            success: false,
            created: 0,
            updated: 0,
            deleted: 0,
            error: message,
        };
    }
}

/**
 * カレンダーから削除されたシフトをDBからも削除する
 * @param calendarKeys - カレンダーに存在するイベントの「calendarEventId_startTime」キーのセット
 * @param rangeStart - 同期対象範囲の開始日
 * @param rangeEnd - 同期対象範囲の終了日
 * @returns 削除したシフト数
 */
async function deleteRemovedShifts(
    calendarKeys: Set<string>,
    rangeStart: Date,
    rangeEnd: Date
): Promise<number> {
    const dbShifts = await prisma.shift.findMany({
        where: {
            startTime: { gte: rangeStart, lt: rangeEnd },
        },
        select: { id: true, calendarEventId: true, startTime: true },
    });

    const toDelete = dbShifts.filter((shift) => {
        const key = `${shift.calendarEventId}_${shift.startTime.toISOString()}`;
        return !calendarKeys.has(key);
    });

    if (toDelete.length === 0) return 0;

    const deleteIds = toDelete.map((s) => s.id);

    await prisma.$transaction([
        prisma.expense.deleteMany({
            where: { entry: { shiftId: { in: deleteIds } } },
        }),
        prisma.entry.deleteMany({
            where: { shiftId: { in: deleteIds } },
        }),
        prisma.shift.deleteMany({
            where: { id: { in: deleteIds } },
        }),
    ]);

    console.log(
        `[同期] カレンダーから削除されたシフト ${toDelete.length}件を削除`
    );
    return toDelete.length;
}

/**
 * カレンダーイベントをShiftレコードとして挿入または更新する
 * @param event - GASから取得したカレンダーイベント
 * @returns "created" | "updated" | "skipped"
 */
async function upsertShift(
    event: GasCalendarEvent
): Promise<"created" | "updated" | "skipped"> {
    const jobName = event.jobName!;

    const job = await prisma.job.upsert({
        where: { name: jobName },
        create: { name: jobName },
        update: {},
    });

    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);

    const existing = await prisma.shift.findUnique({
        where: {
            calendarEventId_startTime: {
                calendarEventId: event.id,
                startTime,
            },
        },
    });

    if (existing) {
        const endChanged = existing.endTime.toISOString() !== event.endTime;

        if (endChanged) {
            await prisma.shift.update({
                where: { id: existing.id },
                data: { endTime, title: event.title },
            });
            return "updated";
        }
        return "skipped";
    }

    await prisma.shift.create({
        data: {
            calendarEventId: event.id,
            jobId: job.id,
            title: event.title,
            startTime,
            endTime,
            entryStatus: "PENDING",
        },
    });
    return "created";
}

const FREEE_JOB_NAME = "モシモス";

/**
 * freee人事労務から勤怠データを取得し、モシモスの未入力シフトに自動入力する
 * @returns 自動入力したエントリー数
 */
async function syncFreeeAttendance(): Promise<FreeeSyncResult> {
    const warnings: string[] = [];

    if (
        !process.env.FREEE_EMAIL ||
        !process.env.FREEE_PASSWORD ||
        !process.env.FREEE_EMPLOYEE_ID
    ) {
        warnings.push(
            "freee自動入力をスキップしました: FREEE_EMAIL / FREEE_PASSWORD / FREEE_EMPLOYEE_ID を確認してください"
        );
        return { created: 0, warnings };
    }

    // モシモスの未入力シフトを取得
    const job = await prisma.job.findUnique({
        where: { name: FREEE_JOB_NAME },
    });
    if (!job) {
        warnings.push(
            `freee自動入力をスキップしました: バイト先「${FREEE_JOB_NAME}」が見つかりません`
        );
        return { created: 0, warnings };
    }

    const pendingShifts = await prisma.shift.findMany({
        where: { jobId: job.id, entryStatus: "PENDING" },
        include: {
            job: true,
            entry: { select: { id: true } },
        },
        orderBy: { startTime: "asc" },
    });
    if (pendingShifts.length === 0) {
        return { created: 0, warnings };
    }

    // 対象月を特定（重複を排除）
    const months = new Set<string>();
    for (const shift of pendingShifts) {
        const y = shift.startTime.getFullYear();
        const m = shift.startTime.getMonth() + 1;
        months.add(`${y}-${m}`);
    }

    // 月ごとにスクレイピング
    const allRecords: FreeeAttendanceRecord[] = [];
    for (const ym of months) {
        const [y, m] = ym.split("-").map(Number);
        try {
            const records = await scrapeFreeeAttendance(y, m);
            allRecords.push(...records);
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            console.error(`[freee同期] ${y}年${m}月の取得に失敗:`, message);
            warnings.push(`freee ${y}年${m}月の取得に失敗しました: ${message}`);
        }
    }

    if (allRecords.length === 0) {
        return { created: 0, warnings };
    }

    // 日付でインデックス化
    const recordByDate = new Map<string, FreeeAttendanceRecord>();
    for (const record of allRecords) {
        if (record.clockIn && record.clockOut) {
            recordByDate.set(record.date, record);
        }
    }

    // シフトとマッチしてEntry作成
    let created = 0;
    const pendingDateKeys: string[] = [];
    for (const shift of pendingShifts) {
        if (shift.entry) {
            await prisma.shift.update({
                where: { id: shift.id },
                data: { entryStatus: "COMPLETED" },
            });
            continue;
        }

        const dateKey = `${shift.startTime.getFullYear()}-${String(shift.startTime.getMonth() + 1).padStart(2, "0")}-${String(shift.startTime.getDate()).padStart(2, "0")}`;
        pendingDateKeys.push(dateKey);

        const record = recordByDate.get(dateKey);
        if (!record || !record.clockIn || !record.clockOut) continue;

        const workMinutes = calcWorkMinutes(
            record.clockIn,
            record.clockOut,
            record.breakStart ?? undefined,
            record.breakEnd ?? undefined,
            record.breakMinutes ?? undefined
        );

        const lateNightMinutes = calcLateNightMinutes(
            record.clockIn,
            record.clockOut,
            record.breakStart ?? undefined,
            record.breakEnd ?? undefined,
            record.breakMinutes ?? undefined
        );

        let income: number | null = null;
        if (job.hourlyWage) {
            income = calcIncomeWithLateNight(
                workMinutes,
                lateNightMinutes,
                job.hourlyWage
            );
        }

        let breakMinutes: number | null = null;
        if (record.breakMinutes != null) {
            breakMinutes = record.breakMinutes;
        } else if (record.breakStart && record.breakEnd) {
            breakMinutes =
                timeToMinutes(record.breakEnd) -
                timeToMinutes(record.breakStart);
        }

        await prisma.$transaction(async (tx) => {
            await tx.entry.create({
                data: {
                    shiftId: shift.id,
                    entryType: "HOURS",
                    clockIn: record.clockIn,
                    clockOut: record.clockOut,
                    breakStart: record.breakStart,
                    breakEnd: record.breakEnd,
                    breakMinutes,
                    workMinutes,
                    lateNightMinutes,
                    income,
                    transportFee: job.defaultTransportFee,
                    note: "freee自動入力",
                },
            });
            await tx.shift.update({
                where: { id: shift.id },
                data: { entryStatus: "COMPLETED" },
            });
        });

        console.log(
            `[freee同期] ${dateKey} ${record.clockIn}-${record.clockOut} を自動入力`
        );
        created++;
    }

    if (created === 0) {
        warnings.push(
            "freee勤怠は取得できましたが、未入力シフトと一致する日付がありませんでした"
        );
        warnings.push(
            `pending=${pendingDateKeys.join(", ")} / extracted=${[...recordByDate.keys()].sort().join(", ")}`
        );
    }

    return { created, warnings };
}
