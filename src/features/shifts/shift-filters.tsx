"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface Job {
    id: string;
    name: string;
}

interface ShiftFiltersProps {
    jobs: Job[];
}

/**
 * シフト一覧のフィルターコンポーネント
 * URLのsearchParamsで状態を管理する
 */
export function ShiftFilters({ jobs }: ShiftFiltersProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const dateFrom = searchParams.get("dateFrom") ?? "";
    const dateTo = searchParams.get("dateTo") ?? "";
    const jobId = searchParams.get("jobId") ?? "";
    const status = searchParams.get("status") ?? "";

    const updateParams = useCallback(
        (key: string, value: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value) {
                params.set(key, value);
            } else {
                params.delete(key);
            }
            router.push(`/shifts?${params.toString()}`);
        },
        [router, searchParams]
    );

    return (
        <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
                <label
                    htmlFor="dateFrom"
                    className="text-sm font-medium"
                >
                    開始日
                </label>
                <input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => updateParams("dateFrom", e.target.value)}
                    className="rounded-md border px-3 py-1.5 text-sm"
                />
            </div>
            <div className="flex flex-col gap-1">
                <label
                    htmlFor="dateTo"
                    className="text-sm font-medium"
                >
                    終了日
                </label>
                <input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => updateParams("dateTo", e.target.value)}
                    className="rounded-md border px-3 py-1.5 text-sm"
                />
            </div>
            <div className="flex flex-col gap-1">
                <label
                    htmlFor="jobId"
                    className="text-sm font-medium"
                >
                    バイト先
                </label>
                <select
                    id="jobId"
                    value={jobId}
                    onChange={(e) => updateParams("jobId", e.target.value)}
                    className="rounded-md border px-3 py-1.5 text-sm"
                >
                    <option value="">すべて</option>
                    {jobs.map((job) => (
                        <option
                            key={job.id}
                            value={job.id}
                        >
                            {job.name}
                        </option>
                    ))}
                </select>
            </div>
            <div className="flex flex-col gap-1">
                <label
                    htmlFor="status"
                    className="text-sm font-medium"
                >
                    ステータス
                </label>
                <select
                    id="status"
                    value={status}
                    onChange={(e) => updateParams("status", e.target.value)}
                    className="rounded-md border px-3 py-1.5 text-sm"
                >
                    <option value="">すべて</option>
                    <option value="COMPLETED">入力済み</option>
                    <option value="PENDING">未入力</option>
                </select>
            </div>
        </div>
    );
}
