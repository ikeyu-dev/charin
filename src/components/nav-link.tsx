"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
    href: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}

/**
 * サイドバー用のアクティブ状態付きナビゲーションリンク
 */
export function NavLink({ href, icon, children }: NavLinkProps) {
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
            {icon}
            {children}
        </Link>
    );
}
