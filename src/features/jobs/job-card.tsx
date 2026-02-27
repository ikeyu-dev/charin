"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/shared/lib/format";
import { updateJob, deleteJob } from "@/actions/job";

interface JobCardProps {
    jobId: string;
    name: string;
    hourlyWage: number | null;
    defaultTransportFee: number | null;
    isOneTime: boolean;
    description: string | null;
    monthlyTotal: number;
    yearlyTotal: number;
    completedCount: number;
    totalShifts: number;
    totalWorkMinutes: number;
}

/**
 * バイト先カード
 * クリックで編集フォームを展開する
 */
export function JobCard({
    jobId,
    name,
    hourlyWage,
    defaultTransportFee,
    isOneTime,
    description,
    monthlyTotal,
    yearlyTotal,
    completedCount,
    totalShifts,
    totalWorkMinutes,
}: JobCardProps) {
    const [expanded, setExpanded] = useState(false);
    const [editName, setEditName] = useState(name);
    const [editWage, setEditWage] = useState(hourlyWage?.toString() ?? "");
    const [editTransport, setEditTransport] = useState(
        defaultTransportFee?.toString() ?? ""
    );
    const [editOneTime, setEditOneTime] = useState(isOneTime);
    const [editDesc, setEditDesc] = useState(description ?? "");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const result = await updateJob({
            id: jobId,
            name: editName || undefined,
            hourlyWage: editWage ? Number(editWage) : null,
            defaultTransportFee: editTransport ? Number(editTransport) : null,
            isOneTime: editOneTime,
            description: editDesc || null,
        });

        if (result.success) {
            setExpanded(false);
            router.refresh();
        } else {
            setError(result.error ?? "更新に失敗しました");
        }

        setLoading(false);
    };

    const handleDelete = async () => {
        if (!confirm(`「${name}」を削除しますか？`)) return;
        setLoading(true);

        const result = await deleteJob(jobId);

        if (result.success) {
            router.refresh();
        } else {
            alert(result.error ?? "削除に失敗しました");
        }

        setLoading(false);
    };

    const workHours = Math.floor(totalWorkMinutes / 60);
    const workMins = totalWorkMinutes % 60;

    return (
        <div className="rounded-xl border">
            {/* クリック可能なヘッダー + 実績部分 */}
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="w-full text-left transition-colors hover:bg-muted/30"
            >
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <div className="flex items-baseline gap-4">
                        <h3 className="text-lg font-semibold">{name}</h3>
                        {isOneTime && (
                            <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                単発
                            </span>
                        )}
                        {hourlyWage && (
                            <span className="text-muted-foreground">
                                &yen;{formatCurrency(hourlyWage)} /h
                            </span>
                        )}
                        {defaultTransportFee && (
                            <span className="text-sm text-muted-foreground">
                                交通費 &yen;
                                {formatCurrency(defaultTransportFee)}
                            </span>
                        )}
                    </div>
                    <span
                        className={`text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                        >
                            <path
                                d="M4 6L8 10L12 6"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </span>
                </div>

                <div className="grid grid-cols-4 divide-x">
                    <div className="p-6">
                        <p className="text-xs text-muted-foreground">今月</p>
                        <p className="mt-1 text-xl font-bold tabular-nums">
                            &yen;{formatCurrency(monthlyTotal)}
                        </p>
                    </div>
                    <div className="p-6">
                        <p className="text-xs text-muted-foreground">年間</p>
                        <p className="mt-1 text-xl font-bold tabular-nums">
                            &yen;{formatCurrency(yearlyTotal)}
                        </p>
                    </div>
                    <div className="p-6">
                        <p className="text-xs text-muted-foreground">
                            入力済みシフト
                        </p>
                        <p className="mt-1 text-xl font-bold tabular-nums">
                            {completedCount}
                            <span className="text-sm font-normal text-muted-foreground">
                                {" "}
                                / {totalShifts}件
                            </span>
                        </p>
                    </div>
                    <div className="p-6">
                        <p className="text-xs text-muted-foreground">
                            総勤務時間
                        </p>
                        <p className="mt-1 text-xl font-bold tabular-nums">
                            {workHours}
                            <span className="text-sm font-normal text-muted-foreground">
                                h {workMins > 0 && `${workMins}m`}
                            </span>
                        </p>
                    </div>
                </div>
            </button>

            {/* メモ */}
            {description && !expanded && (
                <div className="border-t px-6 py-3 text-sm text-muted-foreground">
                    {description}
                </div>
            )}

            {/* 展開時の編集フォーム */}
            {expanded && (
                <div className="border-t px-6 py-5">
                    <form
                        onSubmit={handleUpdate}
                        className="space-y-4"
                    >
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <Label htmlFor={`name-${jobId}`}>
                                    バイト名
                                </Label>
                                <Input
                                    id={`name-${jobId}`}
                                    value={editName}
                                    onChange={(e) =>
                                        setEditName(e.target.value)
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor={`wage-${jobId}`}>
                                    時給（円）
                                </Label>
                                <Input
                                    id={`wage-${jobId}`}
                                    type="number"
                                    min="0"
                                    value={editWage}
                                    onChange={(e) =>
                                        setEditWage(e.target.value)
                                    }
                                    placeholder="任意"
                                />
                            </div>
                            <div>
                                <Label htmlFor={`transport-${jobId}`}>
                                    デフォルト交通費（円）
                                </Label>
                                <Input
                                    id={`transport-${jobId}`}
                                    type="number"
                                    min="0"
                                    value={editTransport}
                                    onChange={(e) =>
                                        setEditTransport(e.target.value)
                                    }
                                    placeholder="任意"
                                />
                            </div>
                            <div className="flex items-center gap-3 sm:col-span-2">
                                <Label htmlFor={`onetime-${jobId}`}>
                                    単発バイト
                                </Label>
                                <Switch
                                    id={`onetime-${jobId}`}
                                    checked={editOneTime}
                                    onCheckedChange={setEditOneTime}
                                />
                            </div>
                            <div>
                                <Label htmlFor={`desc-${jobId}`}>メモ</Label>
                                <Input
                                    id={`desc-${jobId}`}
                                    value={editDesc}
                                    onChange={(e) =>
                                        setEditDesc(e.target.value)
                                    }
                                    placeholder="任意"
                                />
                            </div>
                        </div>
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                        <div className="flex gap-2">
                            <Button
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? "更新中..." : "更新"}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setExpanded(false)}
                            >
                                キャンセル
                            </Button>
                            <div className="flex-1" />
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleDelete}
                                disabled={loading}
                                className="text-destructive hover:text-destructive"
                            >
                                削除
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
