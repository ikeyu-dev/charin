"use client";

import { useRouter } from "next/navigation";

/**
 * ブラウザの履歴に基づいて前のページに戻るボタン
 */
export function BackButton() {
    const router = useRouter();

    return (
        <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-muted-foreground hover:text-foreground"
        >
            戻る
        </button>
    );
}
