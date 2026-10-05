'use client'

import React from "react";
import Link from "next/link";
import {signOut} from "next-auth/react";
import {DatabaseIcon, LogOutIcon, ShieldCheckIcon, UserIcon} from "lucide-react";

import {cn} from "@/lib/utils";
import {DropdownMenuItem, DropdownMenuSeparator} from "@/components/ui/dropdown-menu";
import {ThemeMenu} from "@/components/ThemeMenu";

/**
 * The account menu, the same everywhere: My profile · Your data · Theme ·
 * Privacy · Sign out. `extra` slots in before the theme row (Install app).
 */
export default function AccountMenuItems({extra}: {extra?: React.ReactNode}) {
    const link = (href: string, icon: React.ReactNode, label: string) => (
        <DropdownMenuItem render={(props) => (
            <Link {...props} href={href} className={cn(props.className, "cursor-pointer")}>{icon} {label}</Link>
        )} />
    );
    return (
        <>
            {link("/dashboard/profile", <UserIcon className={"size-4 opacity-70"} />, "My profile")}
            {link("/dashboard/profile#your-data", <DatabaseIcon className={"size-4 opacity-70"} />, "Your data")}
            {extra}
            <DropdownMenuSeparator />
            <ThemeMenu />
            <DropdownMenuSeparator />
            {link("/privacy", <ShieldCheckIcon className={"size-4 opacity-70"} />, "Privacy")}
            <DropdownMenuItem onClick={() => signOut({redirectTo: "/"})} className={"cursor-pointer"}>
                <LogOutIcon className={"size-4 opacity-70"} /> Sign out
            </DropdownMenuItem>
        </>
    );
}
