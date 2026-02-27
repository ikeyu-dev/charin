"use server";

import { prisma } from "@/shared/lib/prisma";
import {
    createJobSchema,
    updateJobSchema,
    type CreateJobInput,
    type UpdateJobInput,
} from "@/shared/lib/validation";
import { revalidatePath } from "next/cache";

interface JobResult {
    success: boolean;
    error?: string;
}

/**
 * バイト先を新規作成する
 * @param input - バイト先の情報
 * @returns 処理結果
 */
export async function createJob(input: CreateJobInput): Promise<JobResult> {
    const parsed = createJobSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues.map((i) => i.message).join(", "),
        };
    }

    try {
        await prisma.job.create({ data: parsed.data });
        revalidatePath("/jobs");
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : "不明なエラー";
        return { success: false, error: message };
    }
}

/**
 * バイト先の情報を更新する
 * @param input - 更新するバイト先の情報
 * @returns 処理結果
 */
export async function updateJob(input: UpdateJobInput): Promise<JobResult> {
    const parsed = updateJobSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues.map((i) => i.message).join(", "),
        };
    }

    const { id, ...data } = parsed.data;

    try {
        await prisma.job.update({ where: { id }, data });
        revalidatePath("/jobs");
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : "不明なエラー";
        return { success: false, error: message };
    }
}

/**
 * バイト先を削除する
 * @param id - バイト先ID
 * @returns 処理結果
 */
export async function deleteJob(id: string): Promise<JobResult> {
    try {
        const shiftsCount = await prisma.shift.count({
            where: { jobId: id },
        });

        if (shiftsCount > 0) {
            return {
                success: false,
                error: `このバイト先には ${shiftsCount} 件のシフトが紐づいているため削除できません`,
            };
        }

        await prisma.job.delete({ where: { id } });
        revalidatePath("/jobs");
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : "不明なエラー";
        return { success: false, error: message };
    }
}
