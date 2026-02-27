import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { NavLink } from "@/components/nav-link";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LayoutDashboard, Calendar, Briefcase, BarChart3 } from "lucide-react";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Charin - 収入管理",
    description: "バイト収入を管理するアプリケーション",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ja">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <TooltipProvider>
                    <div className="flex min-h-screen">
                        <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r bg-muted/30">
                            <div className="p-6">
                                <Link
                                    href="/"
                                    className="text-xl font-bold tracking-tight"
                                >
                                    Charin
                                </Link>
                            </div>
                            <nav className="flex flex-1 flex-col gap-1 px-3">
                                <NavLink
                                    href="/"
                                    icon={
                                        <LayoutDashboard className="h-4 w-4" />
                                    }
                                >
                                    ダッシュボード
                                </NavLink>
                                <NavLink
                                    href="/calendar"
                                    icon={<Calendar className="h-4 w-4" />}
                                >
                                    カレンダー
                                </NavLink>
                                <NavLink
                                    href="/jobs"
                                    icon={<Briefcase className="h-4 w-4" />}
                                >
                                    バイト管理
                                </NavLink>
                                <NavLink
                                    href="/report"
                                    icon={<BarChart3 className="h-4 w-4" />}
                                >
                                    レポート
                                </NavLink>
                            </nav>
                        </aside>
                        <main className="flex-1 overflow-auto p-8">
                            {children}
                        </main>
                    </div>
                </TooltipProvider>
            </body>
        </html>
    );
}
