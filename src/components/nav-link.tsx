"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

interface NavLinkProps {
    href: string;
    icon: LucideIcon;
    children: React.ReactNode;
}

/**
 * サイドバー用のアクティブ状態付きナビゲーションリンク
 */
export function NavLink({ href, icon: Icon, children }: NavLinkProps) {
    const pathname = usePathname();
    const isActive =
        href === "/" ? pathname === "/" : pathname.startsWith(href);

    return (
        <Link
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive
                    ? "bg-secondary font-medium text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            }`}
        >
            <Icon className="h-4 w-4" />
            {children}
        </Link>
    );
}
