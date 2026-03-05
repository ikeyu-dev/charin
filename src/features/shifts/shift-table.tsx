import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateShort, formatTime } from "@/shared/lib/date";
import { formatCurrency } from "@/shared/lib/format";

interface ShiftWithRelations {
    id: string;
    startTime: Date;
    endTime: Date;
    entryStatus: string;
    job: {
        name: string;
    };
    entry: {
        income: number | null;
    } | null;
}

interface ShiftTableProps {
    shifts: ShiftWithRelations[];
}

/**
 * シフト一覧テーブル
 * 日付、バイト先、時間帯、ステータス、収入を表示する
 */
export function ShiftTable({ shifts }: ShiftTableProps) {
    if (shifts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-muted-foreground">
                <p>該当するシフトがありません</p>
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>日付</TableHead>
                    <TableHead>バイト先</TableHead>
                    <TableHead>時間帯</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead className="text-right">収入</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {shifts.map((shift) => (
                    <TableRow key={shift.id}>
                        <TableCell>
                            <Link
                                href={`/entry/${shift.id}`}
                                className="hover:underline"
                            >
                                {formatDateShort(shift.startTime)}
                            </Link>
                        </TableCell>
                        <TableCell>{shift.job.name}</TableCell>
                        <TableCell>
                            {formatTime(shift.startTime)} ~{" "}
                            {formatTime(shift.endTime)}
                        </TableCell>
                        <TableCell>
                            <Badge
                                variant={
                                    shift.entryStatus === "COMPLETED"
                                        ? "default"
                                        : "secondary"
                                }
                            >
                                {shift.entryStatus === "COMPLETED"
                                    ? "入力済み"
                                    : "未入力"}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                            {shift.entry?.income != null
                                ? `${formatCurrency(shift.entry.income)}円`
                                : "-"}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
