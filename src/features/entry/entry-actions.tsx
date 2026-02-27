"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteEntry } from "@/actions/entry";

interface EntryActionsProps {
    shiftId: string;
    entryId: string;
}

/**
 * 入力済みエントリーの編集・削除ボタン
 */
export function EntryActions({ shiftId, entryId }: EntryActionsProps) {
    const router = useRouter();
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm("この入力を削除しますか？")) return;
        setDeleting(true);
        const result = await deleteEntry(entryId);
        if (result.success) {
            router.refresh();
        }
        setDeleting(false);
    };

    return (
        <div className="mt-4 flex gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/entry/${shiftId}?edit=true`)}
            >
                編集
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={handleDelete}
                disabled={deleting}
            >
                {deleting ? "削除中..." : "削除"}
            </Button>
        </div>
    );
}
