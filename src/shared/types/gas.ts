/** GAS APIから返却されるカレンダーイベント */
export interface GasCalendarEvent {
    id: string;
    title: string;
    jobName: string | null;
    startTime: string;
    endTime: string;
    description: string;
    isAllDay: boolean;
}

/** GAS APIのイベント取得レスポンス */
export interface GasEventsResponse {
    events: GasCalendarEvent[];
    count: number;
}

/** GAS APIのエラーレスポンス */
export interface GasErrorResponse {
    error: string;
}
