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

        const records = await extractAttendanceData(page, year, month);
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
 * ページテキストから「日付 + HH:MM 〜 HH:MM」パターンを解析する
 */
async function extractAttendanceData(
    page: Page,
    year: number,
    month: number
): Promise<FreeeAttendanceRecord[]> {
    const bodyText = await page.evaluate(() => document.body.innerText);
    return parseAttendanceText(bodyText, year, month);
}

function parseAttendanceText(
    bodyText: string,
    year: number,
    month: number
): FreeeAttendanceRecord[] {
    const records: FreeeAttendanceRecord[] = [];
    const seenDates = new Set<string>();

    const allLines = bodyText.split("\n").map((l) => l.trim());
    const startIndex = Math.max(
        0,
        allLines.findIndex((line) => line.includes("日次データ出力"))
    );
    const lines = allLines.slice(startIndex);
    const timeRangePattern = /(\d{1,2}:\d{2})\s*[〜~\-]\s*(\d{1,2}:\d{2})/;
    const dateTimeSameLinePattern = new RegExp(
        `(?:${month}[\\\\/]\\s*|${month}月\\s*)?(\\d{1,2})(?:日)?(?:\\s*\\([^)]*\\))?\\s+(\\d{1,2}:\\d{2})\\s*[〜~\\-]\\s*(\\d{1,2}:\\d{2})`
    );
    const dayLinePatterns = [
        new RegExp(`^${month}[\\\\/]\\s*(\\d{1,2})$`),
        new RegExp(`^${month}月\\s*(\\d{1,2})日?$`),
        /^(\d{1,2})日$/,
        /^(\d{1,2})\s*\([^)]*\)$/,
        /^(\d{1,2})$/,
    ];

    const pushRecord = (day: number, clockIn: string, clockOut: string) => {
        const monthStr = String(month).padStart(2, "0");
        const dayStr = String(day).padStart(2, "0");
        const date = `${year}-${monthStr}-${dayStr}`;
        if (seenDates.has(date)) return;
        seenDates.add(date);
        records.push({
            date,
            clockIn,
            clockOut,
            breakStart: null,
            breakEnd: null,
        });
    };

    let currentDay: number | null = null;
    let remainingLinesForDay = 0;
    for (const line of lines) {
        const dateTimeSameLineMatch = line.match(dateTimeSameLinePattern);
        if (dateTimeSameLineMatch) {
            const day = parseInt(dateTimeSameLineMatch[1], 10);
            if (day >= 1 && day <= 31) {
                pushRecord(
                    day,
                    dateTimeSameLineMatch[2],
                    dateTimeSameLineMatch[3]
                );
                currentDay = null;
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
            remainingLinesForDay = 3;
            continue;
        }

        if (currentDay !== null) {
            const timeMatch = line.match(timeRangePattern);
            if (timeMatch) {
                pushRecord(currentDay, timeMatch[1], timeMatch[2]);
                currentDay = null;
                remainingLinesForDay = 0;
                continue;
            }

            remainingLinesForDay -= 1;
            if (remainingLinesForDay <= 0) {
                currentDay = null;
            }
        }
    }

    return records;
}
