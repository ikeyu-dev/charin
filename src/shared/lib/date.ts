const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"] as const;

/**
 * 日付を「M/D (曜日)」形式にフォーマットする
 * @param date - 日付
 * @returns フォーマットされた日付文字列（例: "2/20 (木)"）
 */
export function formatDateShort(date: Date): string {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayName = DAY_NAMES[date.getDay()];
    return `${month}/${day} (${dayName})`;
}

/**
 * 日付を「HH:MM」形式にフォーマットする
 * @param date - 日付
 * @returns フォーマットされた時刻文字列（例: "10:00"）
 */
export function formatTime(date: Date): string {
    return date.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

/**
 * HH:MM形式の時刻文字列を分数に変換する
 * @param time - "HH:MM" 形式の時刻
 * @returns 0:00からの経過分数
 */
export function timeToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
}

/**
 * 出勤・休憩・退勤時刻から実働時間（分）を算出する
 * @param clockIn - 出勤時刻 "HH:MM"
 * @param clockOut - 退勤時刻 "HH:MM"
 * @param breakStart - 休憩開始時刻 "HH:MM"（任意）
 * @param breakEnd - 休憩終了時刻 "HH:MM"（任意）
 * @returns 実働時間（分）
 */
export function calcWorkMinutes(
    clockIn: string,
    clockOut: string,
    breakStart?: string,
    breakEnd?: string
): number {
    const totalMinutes = timeToMinutes(clockOut) - timeToMinutes(clockIn);
    let breakMinutes = 0;
    if (breakStart && breakEnd) {
        breakMinutes = timeToMinutes(breakEnd) - timeToMinutes(breakStart);
    }
    return totalMinutes - breakMinutes;
}

/** 深夜時間帯の境界（分） */
const LATE_NIGHT_EARLY_END = 5 * 60; // 5:00
const LATE_NIGHT_START = 22 * 60; // 22:00
const LATE_NIGHT_NEXT_END = 29 * 60; // 翌5:00

/**
 * 2つの区間の重複分数を求める
 */
function overlapMinutes(
    aStart: number,
    aEnd: number,
    bStart: number,
    bEnd: number
): number {
    return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

/**
 * 勤務時間のうち深夜時間帯（22:00〜翌5:00）に該当する分数を算出する
 * 休憩時間が深夜帯に重なる場合はその分を差し引く
 * @param clockIn - 出勤時刻 "HH:MM"
 * @param clockOut - 退勤時刻 "HH:MM"（24時間超表記対応）
 * @param breakStart - 休憩開始時刻 "HH:MM"（任意）
 * @param breakEnd - 休憩終了時刻 "HH:MM"（任意）
 * @param breakMins - 休憩分数（任意、breakStart/breakEnd が無い場合に使用）
 * @returns 深夜時間帯の実働分数
 */
export function calcLateNightMinutes(
    clockIn: string,
    clockOut: string,
    breakStart?: string,
    breakEnd?: string,
    breakMins?: number
): number {
    const inMin = timeToMinutes(clockIn);
    const outMin = timeToMinutes(clockOut);

    // 勤務時間と深夜帯の重なり: [0:00, 5:00) と [22:00, 翌5:00)
    let late =
        overlapMinutes(inMin, outMin, 0, LATE_NIGHT_EARLY_END) +
        overlapMinutes(inMin, outMin, LATE_NIGHT_START, LATE_NIGHT_NEXT_END);

    // 休憩が深夜帯に重なる分を差し引く
    if (breakStart && breakEnd) {
        const bStart = timeToMinutes(breakStart);
        const bEnd = timeToMinutes(breakEnd);
        late -=
            overlapMinutes(bStart, bEnd, 0, LATE_NIGHT_EARLY_END) +
            overlapMinutes(bStart, bEnd, LATE_NIGHT_START, LATE_NIGHT_NEXT_END);
    }

    return Math.max(0, late);
}

/**
 * 深夜手当を含む収入を計算する
 * 深夜時間帯（22:00〜翌5:00）は25%割増
 * @param workMinutes - 総実働時間（分）
 * @param lateNightMinutes - うち深夜帯の実働時間（分）
 * @param hourlyWage - 時給（円）
 * @returns 収入（円）
 */
export function calcIncomeWithLateNight(
    workMinutes: number,
    lateNightMinutes: number,
    hourlyWage: number
): number {
    const basePay = (workMinutes * hourlyWage) / 60;
    const lateNightPremium = (lateNightMinutes * hourlyWage * 0.25) / 60;
    return Math.round(basePay + lateNightPremium);
}

/**
 * 収入管理上の年度開始日（前年12月1日）を取得する
 * 前年12月~今年11月の勤務分を1年間の収入として管理する
 * @returns 前年12月1日
 */
export function getStartOfFiscalYear(): Date {
    return new Date(new Date().getFullYear() - 1, 11, 1);
}

/**
 * 収入管理上の年度終了日（今年11月末日の翌日=12月1日）を取得する
 * @returns 今年12月1日
 */
export function getEndOfFiscalYear(): Date {
    return new Date(new Date().getFullYear(), 11, 1);
}

/**
 * 今月の1日のDateオブジェクトを取得する
 * @returns 今月の1日
 */
export function getStartOfMonth(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
}

/** カレンダーグリッドの1セル分 */
export interface CalendarDay {
    date: Date;
    isCurrentMonth: boolean;
}

/**
 * 指定月のカレンダーグリッド用日付配列を生成する
 * 日曜始まりで、前月末・翌月頭のpadding日を含む
 * @param year - 年
 * @param month - 月（0-11）
 * @returns 7列 x N行分の日付配列
 */
export function getCalendarDays(year: number, month: number): CalendarDay[] {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: CalendarDay[] = [];

    // 前月のpadding（月の1日の曜日分）
    for (let i = firstDay.getDay() - 1; i >= 0; i--) {
        days.push({
            date: new Date(year, month, -i),
            isCurrentMonth: false,
        });
    }

    // 当月
    for (let d = 1; d <= lastDay.getDate(); d++) {
        days.push({
            date: new Date(year, month, d),
            isCurrentMonth: true,
        });
    }

    // 翌月のpadding（7の倍数になるまで）
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
        for (let d = 1; d <= remaining; d++) {
            days.push({
                date: new Date(year, month + 1, d),
                isCurrentMonth: false,
            });
        }
    }

    return days;
}
