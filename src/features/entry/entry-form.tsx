"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createEntry, updateEntry } from "@/actions/entry";
import { formatCurrency, formatMinutesToHours } from "@/shared/lib/format";
import { Bus, Receipt, StickyNote } from "lucide-react";
import {
    timeToMinutes,
    calcLateNightMinutes,
    calcIncomeWithLateNight,
} from "@/shared/lib/date";

interface ExpenseRow {
    name: string;
    amount: string;
}

/** 編集モード時に渡す既存エントリーのデータ */
export interface EntryInitialData {
    entryId: string;
    entryType: "HOURS" | "INCOME";
    clockIn: string | null;
    breakStart: string | null;
    breakEnd: string | null;
    breakMinutes: number | null;
    clockOut: string | null;
    income: number | null;
    transportFee: number | null;
    note: string | null;
    expenses: { name: string; amount: number }[];
}

interface EntryFormProps {
    shiftId: string;
    hourlyWage: number | null;
    defaultTransportFee: number | null;
    /** 既存エントリーのデータ（編集モード時） */
    initialData?: EntryInitialData;
}

/**
 * 勤務時間/収入の入力フォーム
 * Tabs で入力モードを切り替え、Switch で交通費をトグルする
 */
export function EntryForm({
    shiftId,
    hourlyWage,
    defaultTransportFee,
    initialData,
}: EntryFormProps) {
    const isEditMode = !!initialData;

    /**
     * 24時間超表記の退勤時刻を通常表記+翌日フラグに分解する
     * 例: "25:30" → { time: "1:30", nextDay: true }
     */
    const parseClockOut = (
        raw: string | null
    ): { time: string; nextDay: boolean } => {
        if (!raw) return { time: "", nextDay: false };
        const [h, m] = raw.split(":").map(Number);
        if (h >= 24) {
            return {
                time: `${String(h - 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
                nextDay: true,
            };
        }
        return { time: raw, nextDay: false };
    };

    const parsedClockOut = parseClockOut(initialData?.clockOut ?? null);

    /** 休憩の初期モードを判定する */
    const initialBreakMode = (): "time" | "minutes" => {
        if (!initialData) return "time";
        if (initialData.breakStart && initialData.breakEnd) return "time";
        if (initialData.breakMinutes != null) return "minutes";
        return "time";
    };

    const [entryType, setEntryType] = useState<"HOURS" | "INCOME">(
        initialData?.entryType ?? "HOURS"
    );
    const [clockIn, setClockIn] = useState(initialData?.clockIn ?? "");
    const [breakMode, setBreakMode] = useState<"time" | "minutes">(
        initialBreakMode()
    );
    const [breakStart, setBreakStart] = useState(initialData?.breakStart ?? "");
    const [breakEnd, setBreakEnd] = useState(initialData?.breakEnd ?? "");
    const [breakMinutesInput, setBreakMinutesInput] = useState(
        initialData?.breakMinutes != null
            ? String(initialData.breakMinutes)
            : ""
    );
    const [clockOut, setClockOut] = useState(parsedClockOut.time);
    const [clockOutNextDay, setClockOutNextDay] = useState(
        parsedClockOut.nextDay
    );
    const [income, setIncome] = useState(
        initialData?.income != null ? String(initialData.income) : ""
    );
    const [transportEnabled, setTransportEnabled] = useState(
        initialData
            ? initialData.transportFee !== null
            : defaultTransportFee !== null
    );
    const [transportFee, setTransportFee] = useState(
        initialData?.transportFee != null
            ? String(initialData.transportFee)
            : (defaultTransportFee?.toString() ?? "")
    );
    const [expenses, setExpenses] = useState<ExpenseRow[]>(
        initialData?.expenses.map((e) => ({
            name: e.name,
            amount: String(e.amount),
        })) ?? []
    );
    const [note, setNote] = useState(initialData?.note ?? "");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    /** 翌日フラグを考慮して退勤時刻を分数に変換する */
    const clockOutMinutes = () => {
        if (!clockOut) return 0;
        return timeToMinutes(clockOut) + (clockOutNextDay ? 24 * 60 : 0);
    };

    const calcWorkMinutes = () => {
        if (!clockIn || !clockOut) return 0;
        try {
            const total = clockOutMinutes() - timeToMinutes(clockIn);
            let breakMin = 0;
            if (breakMode === "time" && breakStart && breakEnd) {
                breakMin = timeToMinutes(breakEnd) - timeToMinutes(breakStart);
            } else if (breakMode === "minutes" && breakMinutesInput) {
                breakMin = Number(breakMinutesInput);
            }
            return Math.max(0, total - breakMin);
        } catch {
            return 0;
        }
    };

    const workMinutes = calcWorkMinutes();

    // 退勤時刻を24時間超表記に変換して深夜時間を計算
    const resolvedClockOutForCalc = clockOutNextDay
        ? `${parseInt(clockOut.split(":")[0] || "0", 10) + 24}:${clockOut.split(":")[1] || "00"}`
        : clockOut;

    const lateNightMinutes =
        clockIn && clockOut
            ? calcLateNightMinutes(
                  clockIn,
                  resolvedClockOutForCalc,
                  breakMode === "time" && breakStart ? breakStart : undefined,
                  breakMode === "time" && breakEnd ? breakEnd : undefined,
                  breakMode === "minutes" && breakMinutesInput
                      ? Number(breakMinutesInput)
                      : undefined
              )
            : 0;

    const calculatedIncome =
        entryType === "HOURS" && hourlyWage && workMinutes > 0
            ? calcIncomeWithLateNight(workMinutes, lateNightMinutes, hourlyWage)
            : null;

    const expensesTotal = expenses.reduce(
        (sum, e) => sum + Number(e.amount || 0),
        0
    );

    const totalAmount =
        (entryType === "HOURS"
            ? (calculatedIncome ?? 0)
            : Number(income || 0)) +
        (transportEnabled ? Number(transportFee || 0) : 0) +
        expensesTotal;

    const addExpenseRow = () => {
        setExpenses([...expenses, { name: "", amount: "" }]);
    };

    const updateExpense = (
        index: number,
        field: keyof ExpenseRow,
        value: string
    ) => {
        const updated = [...expenses];
        updated[index] = { ...updated[index], [field]: value };
        setExpenses(updated);
    };

    const removeExpense = (index: number) => {
        setExpenses(expenses.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const validExpenses = expenses
            .filter((e) => e.name && Number(e.amount) > 0)
            .map((e) => ({ name: e.name, amount: Number(e.amount) }));

        // 翌日フラグがある場合、時刻を24時間超表記に変換（例: "0:04" → "24:04"）
        const resolvedClockOut = clockOutNextDay
            ? `${parseInt(clockOut.split(":")[0], 10) + 24}:${clockOut.split(":")[1]}`
            : clockOut;

        const entryInput =
            entryType === "HOURS"
                ? {
                      shiftId,
                      entryType: "HOURS" as const,
                      clockIn,
                      breakStart:
                          breakMode === "time" && breakStart
                              ? breakStart
                              : undefined,
                      breakEnd:
                          breakMode === "time" && breakEnd
                              ? breakEnd
                              : undefined,
                      breakMinutes:
                          breakMode === "minutes" && breakMinutesInput
                              ? Number(breakMinutesInput)
                              : undefined,
                      clockOut: resolvedClockOut,
                      transportFee: transportEnabled
                          ? Number(transportFee || 0)
                          : null,
                      expenses:
                          validExpenses.length > 0 ? validExpenses : undefined,
                      note: note || undefined,
                  }
                : {
                      shiftId,
                      entryType: "INCOME" as const,
                      income: Number(income),
                      transportFee: transportEnabled
                          ? Number(transportFee || 0)
                          : null,
                      expenses:
                          validExpenses.length > 0 ? validExpenses : undefined,
                      note: note || undefined,
                  };

        const result = isEditMode
            ? await updateEntry(initialData.entryId, entryInput)
            : await createEntry(entryInput);

        if (result.success) {
            router.push("/");
        } else {
            setError(result.error ?? "保存に失敗しました");
        }

        setLoading(false);
    };

    return (
        <div className="rounded-xl border p-6">
            <form
                onSubmit={handleSubmit}
                className="space-y-6"
            >
                <Tabs
                    value={entryType}
                    onValueChange={(v) => setEntryType(v as "HOURS" | "INCOME")}
                >
                    <TabsList className="w-full">
                        <TabsTrigger
                            value="HOURS"
                            className="flex-1"
                        >
                            勤務時間
                        </TabsTrigger>
                        <TabsTrigger
                            value="INCOME"
                            className="flex-1"
                        >
                            収入直接入力
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent
                        value="HOURS"
                        className="mt-4"
                    >
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label htmlFor="clockIn">出勤</Label>
                                    <Input
                                        id="clockIn"
                                        type="time"
                                        value={clockIn}
                                        onChange={(e) =>
                                            setClockIn(e.target.value)
                                        }
                                        required={entryType === "HOURS"}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="clockOut">退勤</Label>
                                    <Input
                                        id="clockOut"
                                        type="time"
                                        value={clockOut}
                                        onChange={(e) =>
                                            setClockOut(e.target.value)
                                        }
                                        required={entryType === "HOURS"}
                                    />
                                    <button
                                        type="button"
                                        className={`mt-1 rounded px-2 py-0.5 text-xs transition-colors ${
                                            clockOutNextDay
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-muted-foreground hover:text-foreground"
                                        }`}
                                        onClick={() =>
                                            setClockOutNextDay(!clockOutNextDay)
                                        }
                                    >
                                        翌日
                                    </button>
                                </div>
                            </div>

                            {/* 休憩入力 */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Label>休憩</Label>
                                    <div className="flex rounded-md border text-xs">
                                        <button
                                            type="button"
                                            className={`px-2.5 py-1 transition-colors ${
                                                breakMode === "time"
                                                    ? "bg-primary text-primary-foreground"
                                                    : "text-muted-foreground hover:text-foreground"
                                            }`}
                                            onClick={() => setBreakMode("time")}
                                        >
                                            時刻
                                        </button>
                                        <button
                                            type="button"
                                            className={`px-2.5 py-1 transition-colors ${
                                                breakMode === "minutes"
                                                    ? "bg-primary text-primary-foreground"
                                                    : "text-muted-foreground hover:text-foreground"
                                            }`}
                                            onClick={() =>
                                                setBreakMode("minutes")
                                            }
                                        >
                                            分数
                                        </button>
                                    </div>
                                </div>
                                {breakMode === "time" ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label htmlFor="breakStart">
                                                開始
                                            </Label>
                                            <Input
                                                id="breakStart"
                                                type="time"
                                                value={breakStart}
                                                onChange={(e) =>
                                                    setBreakStart(
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="breakEnd">
                                                終了
                                            </Label>
                                            <Input
                                                id="breakEnd"
                                                type="time"
                                                value={breakEnd}
                                                onChange={(e) =>
                                                    setBreakEnd(e.target.value)
                                                }
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <Input
                                            id="breakMinutes"
                                            type="number"
                                            min="0"
                                            value={breakMinutesInput}
                                            onChange={(e) =>
                                                setBreakMinutesInput(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="0"
                                        />
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            分
                                        </p>
                                    </div>
                                )}
                            </div>
                            {(workMinutes > 0 || calculatedIncome !== null) && (
                                <div className="space-y-1 text-sm text-muted-foreground">
                                    <div className="flex gap-6">
                                        {workMinutes > 0 && (
                                            <span>
                                                実働{" "}
                                                {formatMinutesToHours(
                                                    workMinutes
                                                )}
                                            </span>
                                        )}
                                        {calculatedIncome !== null && (
                                            <span>
                                                &yen;
                                                {formatCurrency(
                                                    calculatedIncome
                                                )}
                                            </span>
                                        )}
                                    </div>
                                    {lateNightMinutes > 0 && (
                                        <div className="text-xs">
                                            うち深夜{" "}
                                            {formatMinutesToHours(
                                                lateNightMinutes
                                            )}
                                            （25%割増）
                                        </div>
                                    )}
                                </div>
                            )}
                            {!hourlyWage && (
                                <p className="text-sm text-destructive">
                                    時給が未設定です。バイト管理画面で設定してください。
                                </p>
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent
                        value="INCOME"
                        className="mt-4"
                    >
                        <div>
                            <Label htmlFor="income">収入額（円）</Label>
                            <Input
                                id="income"
                                type="number"
                                min="0"
                                value={income}
                                onChange={(e) => setIncome(e.target.value)}
                                placeholder="0"
                            />
                        </div>
                    </TabsContent>
                </Tabs>

                <Separator />

                {/* 交通費 */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label
                            htmlFor="transport-switch"
                            className="flex items-center gap-2"
                        >
                            <Bus className="h-4 w-4 text-muted-foreground" />
                            交通費
                        </Label>
                        <Switch
                            id="transport-switch"
                            checked={transportEnabled}
                            onCheckedChange={setTransportEnabled}
                        />
                    </div>
                    {transportEnabled && (
                        <div>
                            <Input
                                type="number"
                                min="0"
                                value={transportFee}
                                onChange={(e) =>
                                    setTransportFee(e.target.value)
                                }
                                placeholder="0"
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                                円
                            </p>
                        </div>
                    )}
                </div>

                <Separator />

                {/* 経費 */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            経費
                        </Label>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addExpenseRow}
                        >
                            追加
                        </Button>
                    </div>
                    {expenses.map((expense, i) => (
                        <div
                            key={i}
                            className="flex items-end gap-2"
                        >
                            <div className="flex-1">
                                <Label htmlFor={`expense-name-${i}`}>
                                    名目
                                </Label>
                                <Input
                                    id={`expense-name-${i}`}
                                    value={expense.name}
                                    onChange={(e) =>
                                        updateExpense(i, "name", e.target.value)
                                    }
                                    placeholder="名目"
                                />
                            </div>
                            <div className="w-28">
                                <Label htmlFor={`expense-amount-${i}`}>
                                    金額
                                </Label>
                                <Input
                                    id={`expense-amount-${i}`}
                                    type="number"
                                    min="0"
                                    value={expense.amount}
                                    onChange={(e) =>
                                        updateExpense(
                                            i,
                                            "amount",
                                            e.target.value
                                        )
                                    }
                                    placeholder="0"
                                />
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeExpense(i)}
                                className="text-destructive"
                            >
                                削除
                            </Button>
                        </div>
                    ))}
                </div>

                <Separator />

                {/* メモ */}
                <div>
                    <Label
                        htmlFor="note"
                        className="flex items-center gap-2"
                    >
                        <StickyNote className="h-4 w-4 text-muted-foreground" />
                        メモ
                    </Label>
                    <Input
                        id="note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="任意"
                    />
                </div>

                {/* 合計 */}
                <div className="rounded-lg bg-muted p-4">
                    <div className="flex items-baseline justify-between">
                        <span className="text-sm text-muted-foreground">
                            合計
                        </span>
                        <span className="text-2xl font-bold tabular-nums">
                            &yen;{formatCurrency(totalAmount)}
                        </span>
                    </div>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button
                    type="submit"
                    disabled={loading}
                    className="w-full"
                    size="lg"
                >
                    {loading ? "保存中..." : isEditMode ? "更新" : "保存"}
                </Button>
            </form>
        </div>
    );
}
