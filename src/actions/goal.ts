"use server";

import { prisma } from "@/shared/lib/prisma";
import { goalSchema, type GoalInput } from "@/shared/lib/validation";
import { revalidatePath } from "next/cache";

interface GoalResult {
    success: boolean;
    error?: string;
}

/**
 * 目標金額を取得する
 * @returns 最初のGoalレコード、存在しなければnull
 */
export async function getGoal() {
    return prisma.goal.findFirst();
}

/**
 * 目標金額を作成または更新する
 * @param input - 月間・年間の目標金額
 * @returns 処理結果
 */
export async function upsertGoal(input: GoalInput): Promise<GoalResult> {
    const parsed = goalSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues.map((i) => i.message).join(", "),
        };
    }

    const existing = await prisma.goal.findFirst();
    if (existing) {
        await prisma.goal.update({
            where: { id: existing.id },
            data: {
                monthlyTarget: parsed.data.monthlyTarget ?? null,
                yearlyTarget: parsed.data.yearlyTarget ?? null,
            },
        });
    } else {
        await prisma.goal.create({
            data: {
                monthlyTarget: parsed.data.monthlyTarget ?? null,
                yearlyTarget: parsed.data.yearlyTarget ?? null,
            },
        });
    }

    revalidatePath("/");
    return { success: true };
}
