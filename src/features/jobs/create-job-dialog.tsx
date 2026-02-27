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
import { Switch } from "@/components/ui/switch";
import { createJob } from "@/actions/job";

/**
 * バイト先の新規作成ダイアログ
 */
export function CreateJobDialog() {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [hourlyWage, setHourlyWage] = useState("");
    const [defaultTransportFee, setDefaultTransportFee] = useState("");
    const [isOneTime, setIsOneTime] = useState(false);
    const [description, setDescription] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const result = await createJob({
            name,
            hourlyWage: hourlyWage ? Number(hourlyWage) : undefined,
            defaultTransportFee: defaultTransportFee
                ? Number(defaultTransportFee)
                : undefined,
            isOneTime: isOneTime || undefined,
            description: description || undefined,
        });

        if (result.success) {
            setOpen(false);
            setName("");
            setHourlyWage("");
            setDefaultTransportFee("");
            setIsOneTime(false);
            setDescription("");
            router.refresh();
        } else {
            setError(result.error ?? "作成に失敗しました");
        }

        setLoading(false);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={setOpen}
        >
            <DialogTrigger asChild>
                <Button>新規追加</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>バイト先を追加</DialogTitle>
                </DialogHeader>
                <form
                    onSubmit={handleSubmit}
                    className="space-y-4"
                >
                    <div>
                        <Label htmlFor="name">バイト名</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <Label htmlFor="hourlyWage">時給（円）</Label>
                        <Input
                            id="hourlyWage"
                            type="number"
                            min="0"
                            value={hourlyWage}
                            onChange={(e) => setHourlyWage(e.target.value)}
                            placeholder="任意"
                        />
                    </div>
                    <div>
                        <Label htmlFor="defaultTransportFee">
                            デフォルト交通費（円）
                        </Label>
                        <Input
                            id="defaultTransportFee"
                            type="number"
                            min="0"
                            value={defaultTransportFee}
                            onChange={(e) =>
                                setDefaultTransportFee(e.target.value)
                            }
                            placeholder="任意"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <Label htmlFor="isOneTime">単発バイト</Label>
                        <Switch
                            id="isOneTime"
                            checked={isOneTime}
                            onCheckedChange={setIsOneTime}
                        />
                    </div>
                    <div>
                        <Label htmlFor="description">メモ</Label>
                        <Input
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
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
                        {loading ? "作成中..." : "作成"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
