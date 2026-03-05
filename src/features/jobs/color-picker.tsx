"use client";

import { Check } from "lucide-react";
import { DEFAULT_JOB_COLORS } from "@/shared/lib/color";
import { Label } from "@/components/ui/label";

interface ColorPickerProps {
    value: string | null;
    onChange: (color: string) => void;
}

/**
 * プリセットカラーから選択するカラーピッカー
 */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
    return (
        <div>
            <Label>カラー</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
                {DEFAULT_JOB_COLORS.map((color) => (
                    <button
                        key={color}
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                            backgroundColor: color,
                            borderColor:
                                value === color
                                    ? "var(--foreground)"
                                    : "transparent",
                        }}
                        onClick={() => onChange(color)}
                    >
                        {value === color && (
                            <Check className="h-4 w-4 text-white" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
