"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertGoal } from "@/actions/goal";
import { Target } from "lucide-react";

interface GoalSettingProps {
    /** 現在の月間目標 */
    currentMonthly: number | null;
    /** 現在の年間目標 */
    currentYearly: number | null;
}

/**
 * 目標金額の設定ダイアログ
 */
export function GoalSetting({
    currentMonthly,
    currentYearly,
}: GoalSettingProps) {
    const [open, setOpen] = useState(false);
    const [monthlyTarget, setMonthlyTarget] = useState(
        currentMonthly?.toString() ?? ""
    );
    const [yearlyTarget, setYearlyTarget] = useState(
        currentYearly?.toString() ?? ""
    );
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const result = await upsertGoal({
            monthlyTarget: monthlyTarget ? parseInt(monthlyTarget, 10) : null,
            yearlyTarget: yearlyTarget ? parseInt(yearlyTarget, 10) : null,
        });

        setLoading(false);
        if (!result.success) {
            setError(result.error ?? "保存に失敗しました");
            return;
        }

        setOpen(false);
        router.refresh();
    };

    return (
        <Dialog
            open={open}
            onOpenChange={setOpen}
        >
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                >
                    <Target className="mr-1.5 h-4 w-4" />
                    目標設定
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>目標金額の設定</DialogTitle>
                </DialogHeader>
                <form
                    onSubmit={handleSubmit}
                    className="space-y-4"
                >
                    <div className="space-y-2">
                        <Label htmlFor="monthlyTarget">月間目標（円）</Label>
                        <Input
                            id="monthlyTarget"
                            type="number"
                            min={0}
                            placeholder="例: 80000"
                            value={monthlyTarget}
                            onChange={(e) => setMonthlyTarget(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="yearlyTarget">年間目標（円）</Label>
                        <Input
                            id="yearlyTarget"
                            type="number"
                            min={0}
                            placeholder="例: 1000000"
                            value={yearlyTarget}
                            onChange={(e) => setYearlyTarget(e.target.value)}
                        />
                    </div>
                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={loading}
                    >
                        {loading ? "保存中..." : "保存"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
