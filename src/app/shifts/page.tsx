import { Suspense } from "react";
import { prisma } from "@/shared/lib/prisma";
import { ShiftFilters } from "@/features/shifts/shift-filters";
import { ShiftTable } from "@/features/shifts/shift-table";

interface PageProps {
    searchParams: Promise<{
        dateFrom?: string;
        dateTo?: string;
        jobId?: string;
        status?: string;
    }>;
}

/**
 * シフト一覧ページ
 * フィルター条件に基づいてシフトを一覧表示する
 */
export default async function ShiftsPage({ searchParams }: PageProps) {
    const params = await searchParams;

    const where: Record<string, unknown> = {};

    if (params.dateFrom || params.dateTo) {
        where.startTime = {
            ...(params.dateFrom && {
                gte: new Date(`${params.dateFrom}T00:00:00`),
            }),
            ...(params.dateTo && {
                lte: new Date(`${params.dateTo}T23:59:59`),
            }),
        };
    }

    if (params.jobId) {
        where.jobId = params.jobId;
    }

    if (params.status) {
        where.entryStatus = params.status;
    }

    const [shifts, jobs] = await Promise.all([
        prisma.shift.findMany({
            where,
            include: {
                job: true,
                entry: true,
            },
            orderBy: { startTime: "desc" },
        }),
        prisma.job.findMany({
            orderBy: { name: "asc" },
        }),
    ]);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">シフト一覧</h1>
            <Suspense>
                <ShiftFilters jobs={jobs} />
            </Suspense>
            <ShiftTable shifts={shifts} />
        </div>
    );
}
