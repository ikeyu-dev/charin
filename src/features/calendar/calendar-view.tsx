"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCalendarDays } from "@/shared/lib/date";
import type { CalendarShift } from "@/app/calendar/page";

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** デフォルトのバイト先カラーパレット */
const DEFAULT_COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#84cc16",
];

/**
 * バイト先名からデフォルト色を決定する
 * @param name - バイト先名
 * @returns HEXカラー文字列
 */
function getJobColor(name: string, color: string | null): string {
    if (color) return color;
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return DEFAULT_COLORS[Math.abs(hash) % DEFAULT_COLORS.length];
}

/**
 * 時刻文字列を「H:MM」形式にフォーマットする
 * @param iso - ISO 8601文字列
 * @returns "H:MM" 形式
 */
function formatTimeFromISO(iso: string): string {
    const d = new Date(iso);
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * HH:MM形式の時刻を表示用にフォーマットする
 * 24時間超の場合は「翌H:MM」形式にする（例: "24:04" → "翌0:04"）
 */
function formatClockTime(time: string): string {
    const [h, m] = time.split(":").map(Number);
    if (h >= 24) {
        return `翌${h - 24}:${String(m).padStart(2, "0")}`;
    }
    return time;
}

/**
 * 休憩情報のラベルを生成する
 * breakStart/breakEnd がある場合は「休憩 HH:MM~HH:MM, 計N分」
 * breakMinutes のみの場合は「休憩 N分」
 */
function formatBreakLabel(shift: CalendarShift): string | null {
    if (shift.breakStart && shift.breakEnd && shift.breakMinutes != null) {
        return `休憩 ${shift.breakStart}~${shift.breakEnd}, 計${shift.breakMinutes}分`;
    }
    if (shift.breakStart && shift.breakEnd) {
        return `休憩 ${shift.breakStart}~${shift.breakEnd}`;
    }
    if (shift.breakMinutes != null && shift.breakMinutes > 0) {
        return `休憩 ${shift.breakMinutes}分`;
    }
    return null;
}

interface CalendarViewProps {
    year: number;
    month: number;
    shifts: CalendarShift[];
}

/**
 * カレンダービュー
 * 月間カレンダーグリッドで勤務実績を表示する
 */
export function CalendarView({ year, month, shifts }: CalendarViewProps) {
    const router = useRouter();
    const days = getCalendarDays(year, month);

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

    // 日付ごとにシフトをグループ化
    const shiftsByDate = new Map<string, CalendarShift[]>();
    for (const shift of shifts) {
        const d = new Date(shift.startTime);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!shiftsByDate.has(key)) {
            shiftsByDate.set(key, []);
        }
        shiftsByDate.get(key)!.push(shift);
    }

    const navigateMonth = (delta: number) => {
        const d = new Date(year, month + delta, 1);
        router.push(
            `/calendar?year=${d.getFullYear()}&month=${d.getMonth() + 1}`
        );
    };

    return (
        <div>
            {/* 月ナビゲーション */}
            <div className="mb-6 flex items-center gap-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth(-1)}
                >
                    &lt;
                </Button>
                <h2 className="text-lg font-semibold tabular-nums">
                    {year}年{month + 1}月
                </h2>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth(1)}
                >
                    &gt;
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        const now = new Date();
                        router.push(
                            `/calendar?year=${now.getFullYear()}&month=${now.getMonth() + 1}`
                        );
                    }}
                >
                    今月
                </Button>
            </div>

            {/* 曜日ヘッダー */}
            <div className="grid grid-cols-7 border-b">
                {DAY_LABELS.map((label, i) => (
                    <div
                        key={label}
                        className={`py-2 text-center text-xs font-medium ${
                            i === 0
                                ? "text-red-400"
                                : i === 6
                                  ? "text-blue-400"
                                  : "text-muted-foreground"
                        }`}
                    >
                        {label}
                    </div>
                ))}
            </div>

            {/* 日付グリッド */}
            <div className="grid grid-cols-7">
                {days.map(({ date, isCurrentMonth }) => {
                    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
                    const isToday = dateKey === todayKey;
                    const dayShifts = shiftsByDate.get(dateKey) ?? [];
                    const dayOfWeek = date.getDay();

                    return (
                        <div
                            key={dateKey}
                            className={`min-h-24 border-b border-r p-1.5 ${
                                !isCurrentMonth ? "bg-muted/20" : ""
                            }`}
                        >
                            {/* 日付番号 */}
                            <div className="mb-1">
                                <span
                                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                                        isToday
                                            ? "bg-primary text-primary-foreground font-bold"
                                            : !isCurrentMonth
                                              ? "text-muted-foreground/40"
                                              : dayOfWeek === 0
                                                ? "text-red-400"
                                                : dayOfWeek === 6
                                                  ? "text-blue-400"
                                                  : ""
                                    }`}
                                >
                                    {date.getDate()}
                                </span>
                            </div>

                            {/* シフト一覧 */}
                            <div className="space-y-0.5">
                                {dayShifts.map((shift) => {
                                    const color = getJobColor(
                                        shift.jobName,
                                        shift.jobColor
                                    );
                                    const isCompleted =
                                        shift.entryStatus === "COMPLETED";
                                    const timeStr =
                                        isCompleted &&
                                        shift.clockIn &&
                                        shift.clockOut
                                            ? `${formatClockTime(shift.clockIn)}-${formatClockTime(shift.clockOut)}`
                                            : `${formatTimeFromISO(shift.startTime)}-${formatTimeFromISO(shift.endTime)}`;

                                    const breakLabel = isCompleted
                                        ? formatBreakLabel(shift)
                                        : null;

                                    return (
                                        <Link
                                            key={shift.id}
                                            href={`/entry/${shift.id}`}
                                            className={`block rounded px-1.5 py-0.5 text-[10px] leading-tight transition-opacity hover:opacity-80 ${
                                                isCompleted
                                                    ? "opacity-100"
                                                    : "opacity-50"
                                            }`}
                                            style={{
                                                backgroundColor: `${color}18`,
                                                borderLeft: `2px solid ${color}`,
                                            }}
                                        >
                                            <div
                                                className="truncate font-medium"
                                                style={{ color }}
                                            >
                                                {shift.jobName}
                                            </div>
                                            <div className="text-muted-foreground">
                                                {timeStr}
                                            </div>
                                            {breakLabel && (
                                                <div className="text-muted-foreground/70">
                                                    {breakLabel}
                                                </div>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
