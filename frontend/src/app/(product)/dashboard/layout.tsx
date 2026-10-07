import type {Metadata} from "next";

import DashboardShell from "@/components/dashboard/DashboardShell";

// The shell is a client component; the title has to come from a server layout.
export const metadata: Metadata = {title: "Dashboard"};

export default function DashboardLayout({children}: LayoutProps<"/dashboard">) {
    return <DashboardShell>{children}</DashboardShell>;
}
