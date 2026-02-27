/**
 * GETリクエストのメインハンドラ
 * @param {Object} e - リクエストイベントオブジェクト
 * @returns {GoogleAppsScript.Content.TextOutput} JSON形式のレスポンス
 */
function doGet(e) {
    var path = (e && e.parameter && e.parameter.path) || "";

    switch (path) {
        case "events":
            return handleGetEvents(e);
        case "health":
            return createResponse({ status: "ok" });
        default:
            return createErrorResponse("不明なパス: " + path);
    }
}

/**
 * カレンダーからバイト予定を取得する
 * @param {Object} e - リクエストイベントオブジェクト
 * @returns {GoogleAppsScript.Content.TextOutput} イベント一覧のJSONレスポンス
 */
function handleGetEvents(e) {
    var year =
        (e && e.parameter && e.parameter.year) || new Date().getFullYear();
    var startDate = new Date(Number(year), 0, 1);
    var endDate = new Date();

    var calendar = CalendarApp.getDefaultCalendar();
    var events = calendar.getEvents(startDate, endDate, {
        search: "[バイト]",
    });

    var result = events
        .filter(function (event) {
            return event.getTitle().startsWith("[バイト]");
        })
        .map(function (event) {
            return {
                id: event.getId(),
                title: event.getTitle(),
                jobName: parseJobName(event.getTitle()),
                startTime: event.getStartTime().toISOString(),
                endTime: event.getEndTime().toISOString(),
                description: event.getDescription() || "",
                isAllDay: event.isAllDayEvent(),
            };
        });

    return createResponse({ events: result, count: result.length });
}

/**
 * イベントタイトルからバイト名を抽出する
 * "[バイト]コンビニA" -> "コンビニA"
 * @param {string} title - イベントタイトル
 * @returns {string|null} バイト名。パース失敗時はnull
 */
function parseJobName(title) {
    var match = title.match(/^\[バイト\](.+)$/);
    return match ? match[1].trim() : null;
}

/**
 * 成功レスポンスを生成する
 * @param {Object} data - レスポンスデータ
 * @returns {GoogleAppsScript.Content.TextOutput} JSONレスポンス
 */
function createResponse(data) {
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
        ContentService.MimeType.JSON
    );
}

/**
 * エラーレスポンスを生成する
 * @param {string} message - エラーメッセージ
 * @returns {GoogleAppsScript.Content.TextOutput} エラーJSONレスポンス
 */
function createErrorResponse(message) {
    return ContentService.createTextOutput(
        JSON.stringify({ error: message })
    ).setMimeType(ContentService.MimeType.JSON);
}
