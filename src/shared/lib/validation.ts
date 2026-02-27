import { z } from "zod";

/** 経費のバリデーションスキーマ */
export const expenseSchema = z.object({
    name: z.string().min(1),
    amount: z.number().int().min(0),
});

/** HH:MM形式の時刻バリデーション */
const timeString = z.string().regex(/^\d{1,2}:\d{2}$/, "HH:MM形式で入力");

/** 勤務時間入力のバリデーションスキーマ */
export const hoursEntrySchema = z.object({
    shiftId: z.string().min(1),
    entryType: z.literal("HOURS"),
    clockIn: timeString,
    breakStart: timeString.optional(),
    breakEnd: timeString.optional(),
    breakMinutes: z.number().int().min(0).optional(),
    clockOut: timeString,
    transportFee: z.number().int().min(0).nullable().optional(),
    expenses: z.array(expenseSchema).optional(),
    note: z.string().optional(),
});

/** 収入直接入力のバリデーションスキーマ */
export const incomeEntrySchema = z.object({
    shiftId: z.string().min(1),
    entryType: z.literal("INCOME"),
    income: z.number().int().min(0),
    transportFee: z.number().int().min(0).nullable().optional(),
    expenses: z.array(expenseSchema).optional(),
    note: z.string().optional(),
});

/** 入力データのバリデーションスキーマ（勤務時間 or 収入） */
export const entrySchema = z.discriminatedUnion("entryType", [
    hoursEntrySchema,
    incomeEntrySchema,
]);

/** バイト先作成のバリデーションスキーマ */
export const createJobSchema = z.object({
    name: z.string().min(1),
    hourlyWage: z.number().int().min(0).optional(),
    defaultTransportFee: z.number().int().min(0).optional(),
    isOneTime: z.boolean().optional(),
    description: z.string().optional(),
    color: z.string().optional(),
});

/** バイト先更新のバリデーションスキーマ */
export const updateJobSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    hourlyWage: z.number().int().min(0).nullable().optional(),
    defaultTransportFee: z.number().int().min(0).nullable().optional(),
    isOneTime: z.boolean().optional(),
    description: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
export type HoursEntryInput = z.infer<typeof hoursEntrySchema>;
export type IncomeEntryInput = z.infer<typeof incomeEntrySchema>;
export type EntryInput = z.infer<typeof entrySchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
