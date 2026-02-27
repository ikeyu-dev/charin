"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateJob, deleteJob } from "@/actions/job";

interface JobActionsProps {
    jobId: string;
    jobName: string;
    hourlyWage: number | null;
    defaultTransportFee: number | null;
    description: string | null;
}

/**
 * バイト先の編集・削除アクション（DropdownMenu版）
 */
export function JobActions({
    jobId,
    jobName,
    hourlyWage,
    defaultTransportFee,
    description,
}: JobActionsProps) {
    const [editOpen, setEditOpen] = useState(false);
    const [name, setName] = useState(jobName);
    const [wage, setWage] = useState(hourlyWage?.toString() ?? "");
    const [transport, setTransport] = useState(
        defaultTransportFee?.toString() ?? ""
    );
    const [desc, setDesc] = useState(description ?? "");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const result = await updateJob({
            id: jobId,
            name: name || undefined,
            hourlyWage: wage ? Number(wage) : null,
            defaultTransportFee: transport ? Number(transport) : null,
            description: desc || null,
        });

        if (result.success) {
            setEditOpen(false);
            router.refresh();
        } else {
            setError(result.error ?? "更新に失敗しました");
        }

        setLoading(false);
    };

    const handleDelete = async () => {
        if (!confirm(`「${jobName}」を削除しますか？`)) return;
        setLoading(true);

        const result = await deleteJob(jobId);

        if (result.success) {
            router.refresh();
        } else {
            alert(result.error ?? "削除に失敗しました");
        }

        setLoading(false);
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                    >
                        <span className="text-lg leading-none">...</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>
                        編集
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={handleDelete}
                        className="text-destructive focus:text-destructive"
                    >
                        削除
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog
                open={editOpen}
                onOpenChange={setEditOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>バイト先を編集</DialogTitle>
                    </DialogHeader>
                    <form
                        onSubmit={handleUpdate}
                        className="space-y-4"
                    >
                        <div>
                            <Label htmlFor={`name-${jobId}`}>バイト名</Label>
                            <Input
                                id={`name-${jobId}`}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor={`wage-${jobId}`}>時給（円）</Label>
                            <Input
                                id={`wage-${jobId}`}
                                type="number"
                                min="0"
                                value={wage}
                                onChange={(e) => setWage(e.target.value)}
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
                                value={transport}
                                onChange={(e) => setTransport(e.target.value)}
                                placeholder="任意"
                            />
                        </div>
                        <div>
                            <Label htmlFor={`desc-${jobId}`}>メモ</Label>
                            <Input
                                id={`desc-${jobId}`}
                                value={desc}
                                onChange={(e) => setDesc(e.target.value)}
                                placeholder="任意"
                            />
                        </div>
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? "更新中..." : "更新"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
