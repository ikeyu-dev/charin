"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

/**
 * レポートをブラウザの印刷機能でPDF出力するボタン
 * window.print() を呼び出し、@media print CSSと連携する
 */
export function ExportButton() {
    return (
        <Button
            variant="outline"
            size="sm"
            className="print:hidden"
            onClick={() => window.print()}
        >
            <Printer className="mr-2 h-4 w-4" />
            印刷 / PDF
        </Button>
    );
}
