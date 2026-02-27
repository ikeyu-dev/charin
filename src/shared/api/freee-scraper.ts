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

        // SPAの描画を待つ
        await new Promise((r) => setTimeout(r, 5000));

        const records = await extractAttendanceData(page, year, month);
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

    const records: FreeeAttendanceRecord[] = [];

    // 「日(数字)\n...\nHH:MM 〜 HH:MM」のパターンを探す
    // ページテキストの各行を解析
    const lines = bodyText.split("\n").map((l) => l.trim());

    let currentDay: number | null = null;
    for (const line of lines) {
        // 日付行: 1〜31の数字のみ
        const dayMatch = line.match(/^(\d{1,2})$/);
        if (dayMatch) {
            const d = parseInt(dayMatch[1], 10);
            if (d >= 1 && d <= 31) {
                currentDay = d;
                continue;
            }
        }

        // 時刻行: "HH:MM 〜 HH:MM" パターン
        if (currentDay !== null) {
            const timeMatch = line.match(
                /(\d{1,2}:\d{2})\s*[〜~]\s*(\d{1,2}:\d{2})/
            );
            if (timeMatch) {
                const monthStr = String(month).padStart(2, "0");
                const dayStr = String(currentDay).padStart(2, "0");
                records.push({
                    date: `${year}-${monthStr}-${dayStr}`,
                    clockIn: timeMatch[1],
                    clockOut: timeMatch[2],
                    breakStart: null,
                    breakEnd: null,
                });
                currentDay = null;
            }
        }
    }

    return records;
}
