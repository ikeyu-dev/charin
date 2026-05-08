import puppeteer, { type Page } from "puppeteer";

const LOGIN_URL = "https://accounts.secure.freee.co.jp/login/hr";
const FREEE_BASE = "https://p.secure.freee.co.jp";

/** freee勤怠データの1日分 */
export interface FreeeAttendanceRecord {
    date: string;
    clockIn: string | null;
    clockOut: string | null;
    breakStart: string | null;
    breakEnd: string | null;
    breakMinutes: number | null;
}

/**
 * freee人事労務にログインし、指定月の勤怠データをスクレイピングする
 * @param year - 対象年
 * @param month - 対象月（1-12）
 * @returns 勤怠レコードの配列
 */
export async function scrapeFreeeAttendance(
    year: number,
    month: number
): Promise<FreeeAttendanceRecord[]> {
    const email = process.env.FREEE_EMAIL;
    const password = process.env.FREEE_PASSWORD;
    const employeeId = process.env.FREEE_EMPLOYEE_ID;
    if (!email || !password || !employeeId) {
        throw new Error(
            "FREEE_EMAIL / FREEE_PASSWORD / FREEE_EMPLOYEE_ID が設定されていません"
        );
    }

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
        ],
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        await login(page, email, password);

        // 勤怠ページに遷移（ハッシュベースSPAルーティング）
        // URLの月は給与月（月末締め翌月払いのため、勤務月+1）
        const payMonth = month + 1;
        const payYear = payMonth > 12 ? year + 1 : year;
        const payMonthAdjusted = payMonth > 12 ? payMonth - 12 : payMonth;
        const attendanceUrl = `${FREEE_BASE}/#work_records/${payYear}/${payMonthAdjusted}/employees/${employeeId}`;
        console.log("[freee] 勤怠ページにアクセス:", attendanceUrl);
        await page.goto(attendanceUrl, {
            waitUntil: "networkidle2",
            timeout: 30000,
        });

        // SPAの描画と勤怠一覧のロードを待つ
        await page.waitForFunction(
            () => document.body.innerText.trim().length > 0,
            { timeout: 15000 }
        );
        await new Promise((r) => setTimeout(r, 5000));

        const records = await extractAttendanceData(
            page,
            year,
            month,
            employeeId
        );
        if (records.length === 0) {
            const preview = await page.evaluate(() =>
                document.body.innerText
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .slice(0, 30)
                    .join(" | ")
            );
            throw new Error(
                `freee勤怠データを抽出できませんでした (${year}年${month}月, url=${page.url()}, preview=${preview})`
            );
        }
        console.log(`[freee] ${year}年${month}月: ${records.length}件取得`);

        return records;
    } finally {
        await browser.close();
    }
}

/**
 * freeeにログインする
 */
async function login(page: Page, email: string, password: string) {
    console.log("[freee] ログインページにアクセス");
    await page.goto(LOGIN_URL, { waitUntil: "networkidle2", timeout: 30000 });

    await page.waitForFunction(
        () => document.querySelectorAll("input").length >= 2,
        { timeout: 15000 }
    );

    await page.type("#loginIdField", email);
    await page.type("#passwordField", password);
    await page.keyboard.press("Enter");

    await page.waitForNavigation({
        waitUntil: "networkidle2",
        timeout: 30000,
    });
    console.log("[freee] ログイン完了:", page.url());
}

/**
 * 勤怠ページからデータを抽出する
 * ページテキストから日付ごとの勤務時間と休憩を解析する
 */
async function extractAttendanceData(
    page: Page,
    year: number,
    month: number,
    employeeId: string
): Promise<FreeeAttendanceRecord[]> {
    const apiRecords = await fetchAttendanceDataFromApi(
        page,
        year,
        month,
        employeeId
    );
    if (apiRecords.length > 0) return apiRecords;

    const bodyText = await page.evaluate(() => document.body.innerText);
    return parseAttendanceText(bodyText, year, month);
}

interface FreeeTimeClock {
    datetime?: string;
    type?: string;
    is_destroyed?: boolean;
    deleted_at?: string | null;
}

interface FreeeDailySummariesResponse {
    time_clocks?: Record<string, FreeeTimeClock[]>;
}

async function fetchAttendanceDataFromApi(
    page: Page,
    year: number,
    month: number,
    employeeId: string
): Promise<FreeeAttendanceRecord[]> {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(
        new Date(year, month, 0).getDate()
    ).padStart(2, "0")}`;

    try {
        const data = await page.evaluate(
            async ({ employeeId, startDate, endDate }) => {
                const params = new URLSearchParams({
                    start_date: startDate,
                    end_date: endDate,
                });
                const response = await fetch(
                    `/api/p/employees/${employeeId}/time_clock_daily_summaries?${params.toString()}`,
                    {
                        credentials: "include",
                        headers: { accept: "application/json" },
                    }
                );
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return (await response.json()) as FreeeDailySummariesResponse;
            },
            { employeeId, startDate, endDate }
        );

        return parseTimeClockDailySummaries(data);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
            `[freee] time_clock_daily_summaries APIから取得できませんでした: ${message}`
        );
        return [];
    }
}

function parseTimeClockDailySummaries(
    data: FreeeDailySummariesResponse
): FreeeAttendanceRecord[] {
    return Object.entries(data.time_clocks ?? {})
        .map(([date, clocks]) => parseTimeClocksForDate(date, clocks))
        .filter((record) => record.clockIn && record.clockOut);
}

function parseTimeClocksForDate(
    date: string,
    clocks: FreeeTimeClock[]
): FreeeAttendanceRecord {
    const sorted = clocks
        .filter((clock) => clock.datetime && !clock.is_destroyed)
        .sort(
            (a, b) =>
                new Date(a.datetime ?? "").getTime() -
                new Date(b.datetime ?? "").getTime()
        );

    const clockIn = sorted.find((clock) => clock.type === "clock_in");
    const clockOut = [...sorted]
        .reverse()
        .find((clock) => clock.type === "clock_out");
    const breaks = collectBreaks(sorted);
    const firstBreak = breaks[0];

    return {
        date,
        clockIn: clockIn ? formatClockTime(clockIn.datetime) : null,
        clockOut: clockOut ? formatClockTime(clockOut.datetime) : null,
        breakStart: firstBreak?.start ?? null,
        breakEnd: firstBreak?.end ?? null,
        breakMinutes: breaks.length > 0 ? sumBreakMinutes(breaks) : null,
    };
}

function collectBreaks(
    clocks: FreeeTimeClock[]
): Array<{ start: string; end: string }> {
    const breaks: Array<{ start: string; end: string }> = [];
    let currentStart: string | null = null;

    for (const clock of clocks) {
        if (clock.type === "break_begin") {
            currentStart = formatClockTime(clock.datetime);
            continue;
        }

        if (clock.type === "break_end" && currentStart) {
            breaks.push({
                start: currentStart,
                end: formatClockTime(clock.datetime),
            });
            currentStart = null;
        }
    }

    return breaks;
}

function formatClockTime(datetime: string | undefined): string {
    if (!datetime) return "";
    const match = datetime.match(/T(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : "";
}

function sumBreakMinutes(
    breaks: Array<{ start: string; end: string }>
): number {
    return breaks.reduce(
        (total, rest) =>
            total +
            Math.max(0, timeToMinutes(rest.end) - timeToMinutes(rest.start)),
        0
    );
}

function parseAttendanceText(
    bodyText: string,
    year: number,
    month: number
): FreeeAttendanceRecord[] {
    const allLines = bodyText.split("\n").map((l) => l.trim());
    const startIndex = Math.max(
        0,
        allLines.findIndex((line) => line.includes("日次データ出力"))
    );
    const lines = allLines.slice(startIndex).filter(Boolean);
    const dateTimeSameLinePattern = new RegExp(
        `^(?:${month}[\\\\/]\\s*|${month}月\\s*)?(\\d{1,2})(?:日)?(?:\\s*\\([^)]*\\))?\\s+(.+)$`
    );
    const dayLinePatterns = [
        new RegExp(`^${month}[\\\\/]\\s*(\\d{1,2})$`),
        new RegExp(`^${month}月\\s*(\\d{1,2})日?$`),
        /^(\d{1,2})日$/,
        /^(\d{1,2})\s*\([^)]*\)$/,
        /^(\d{1,2})$/,
    ];

    const records = new Map<number, string[]>();
    const addLine = (day: number, line: string) => {
        if (!records.has(day)) records.set(day, []);
        records.get(day)?.push(line);
    };

    let currentDay: number | null = null;
    for (const line of lines) {
        const dateTimeSameLineMatch = line.match(dateTimeSameLinePattern);
        if (dateTimeSameLineMatch) {
            const day = parseInt(dateTimeSameLineMatch[1], 10);
            if (day >= 1 && day <= 31) {
                currentDay = day;
                addLine(day, dateTimeSameLineMatch[2]);
                continue;
            }
        }

        let matchedDay: number | null = null;
        for (const pattern of dayLinePatterns) {
            const match = line.match(pattern);
            if (match) {
                const d = parseInt(match[1], 10);
                if (d >= 1 && d <= 31) {
                    matchedDay = d;
                    break;
                }
            }
        }
        if (matchedDay !== null) {
            currentDay = matchedDay;
            continue;
        }

        if (currentDay !== null) {
            addLine(currentDay, line);
        }
    }

    return [...records.entries()]
        .map(([day, blockLines]) => parseDayBlock(year, month, day, blockLines))
        .filter((record) => record.clockIn && record.clockOut);
}

const TIME_RANGE_PATTERN = /(\d{1,2}:\d{2})\s*[〜~\-]\s*(\d{1,2}:\d{2})/g;

function parseDayBlock(
    year: number,
    month: number,
    day: number,
    lines: string[]
): FreeeAttendanceRecord {
    const monthStr = String(month).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    const date = `${year}-${monthStr}-${dayStr}`;
    const text = lines.join("\n");
    const ranges = [...text.matchAll(TIME_RANGE_PATTERN)];
    const workRange = ranges[0];
    const breakRange = findBreakRange(lines, ranges);
    const breakMinutes = parseBreakMinutes(lines);

    return {
        date,
        clockIn: workRange?.[1] ?? null,
        clockOut: workRange?.[2] ?? null,
        breakStart: breakRange?.[1] ?? null,
        breakEnd: breakRange?.[2] ?? null,
        breakMinutes,
    };
}

function findBreakRange(
    lines: string[],
    ranges: RegExpMatchArray[]
): RegExpMatchArray | null {
    for (const line of lines) {
        if (!line.includes("休憩")) continue;
        const match = [...line.matchAll(TIME_RANGE_PATTERN)][0];
        if (match) return match;
    }

    const unlabelledRange = ranges[1];
    if (!unlabelledRange) return null;

    const duration =
        timeToMinutes(unlabelledRange[2]) - timeToMinutes(unlabelledRange[1]);
    if (duration > 0 && duration <= 240) return unlabelledRange;

    return null;
}

function parseBreakMinutes(lines: string[]): number | null {
    for (const line of lines) {
        if (!line.includes("休憩")) continue;

        const hourMinute = line.match(/(\d{1,2}):(\d{2})/);
        if (hourMinute && !line.match(TIME_RANGE_PATTERN)) {
            return (
                parseInt(hourMinute[1], 10) * 60 + parseInt(hourMinute[2], 10)
            );
        }

        const hourAndMinute = line.match(
            /(?:(\d+(?:\.\d+)?)\s*時間)?\s*(?:(\d+)\s*分)?/
        );
        if (hourAndMinute) {
            const hours = hourAndMinute[1] ? Number(hourAndMinute[1]) : 0;
            const minutes = hourAndMinute[2] ? Number(hourAndMinute[2]) : 0;
            const total = Math.round(hours * 60 + minutes);
            if (total > 0) return total;
        }
    }

    return null;
}

function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}
