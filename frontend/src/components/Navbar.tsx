'use client'

import React, {useState} from 'react'
import Link from "next/link";
import {
    ChartColumnIcon, CircleHelpIcon, CornerDownLeftIcon, InfoIcon, LayoutGridIcon, LucideIcon, MenuIcon, PackageIcon,
} from "lucide-react";
import {usePathname, useRouter} from "next/navigation";
import {useSession} from "next-auth/react";
import {cn} from "@/lib/utils";
import {Button} from "@/components/ui/button";
import {NAV} from "@/lib/site-copy";
import {useCvScan} from "@/components/cv-ask/useCvScan";
import {track} from "@/lib/analytics";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {initials} from "@/lib/utils";
import {GlassboxWordmark} from "@/components/brand/Logo";
import AccountMenuItems from "@/components/AccountMenuItems";

/*
 * Four plain links, the same on the bar and in the phone menu (founder, 15 Oct 2026): Product is one page, so
 * no menu; Market goes straight to the market pages, so it no longer sits beside the product's own Market view.
 */
export const SITE_LINKS: {href: string; label: string; icon: LucideIcon}[] = [
    {href: "/product", label: NAV.product, icon: PackageIcon},
    {href: "/market", label: NAV.market, icon: ChartColumnIcon},
    {href: "/about", label: NAV.about, icon: InfoIcon},
    {href: "/#faq", label: NAV.faq, icon: CircleHelpIcon},
];

/** A link is current on its page and the pages under it: /market/devops lights Market. */
export const isCurrent = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

const Navbar = () => {
    const {data: session} = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const scan = useCvScan({onDone: () => router.push("/analysis")});
    const [pill, setPill] = useState<{left: number; width: number} | null>(null);
    const pillTo = (e: React.PointerEvent<HTMLElement>) => {
        const el = e.currentTarget, nav = el.closest("nav")!;
        const a = el.getBoundingClientRect(), b = nav.getBoundingClientRect();
        setPill({left: a.left - b.left, width: a.width});
    };

    // The dashboard (and a scan without an account) brings its own shell; a second header would fight the sidebar.
    if (pathname.startsWith("/dashboard") || pathname.startsWith("/analysis")) return null;

    const linkClass = (href: string) => cn(
        "font-mono text-xs uppercase tracking-[0.12em] transition-colors",
        isCurrent(pathname, href) ? "text-foreground" : "text-muted-foreground hover:text-foreground"
    );
    const menuLink = (href: string, icon: React.ReactNode, label: string) => (
        <DropdownMenuItem key={href} render={(props) => (
            <Link {...props} href={href} className={cn(props.className, "cursor-pointer")}>{icon} {label}</Link>
        )} />
    );
    return (
        <header className={"flex items-center justify-between gap-4 px-5 py-5 lg:px-8"}>
            <div className={"flex items-center gap-8"}>
                <Link href={"/"} aria-label={"Glassbox home"} className={"block w-fit"}>
                    {/* Logo exception: the size of the old 24px text wordmark's capitals. The dot peeks here only (founder, 13 Oct 2026). */}
                    <GlassboxWordmark peek className={"h-[17px] w-auto"} />
                </Link>
                <nav aria-label={"Main"} className={"relative hidden items-center gap-5 md:flex"} onPointerLeave={() => setPill(null)}>
                    {/* A soft pill that slides to the item under the pointer (Supabase's top level indicator). */}
                    <span aria-hidden className={"pointer-events-none absolute -inset-y-1.5 rounded-md bg-foreground/[0.06] transition-[left,width,opacity] duration-200 ease-out motion-reduce:transition-none"}
                          style={{left: (pill?.left ?? 0) - 10, width: (pill?.width ?? 0) + 20, opacity: pill ? 1 : 0}} />
                    {SITE_LINKS.map((link) => (
                        <Link key={link.href} href={link.href} onPointerEnter={pillTo} aria-current={isCurrent(pathname, link.href) ? "page" : undefined}
                              className={cn(linkClass(link.href), "relative")}>{link.label}</Link>
                    ))}
                </nav>
            </div>

            <div className={"flex items-center gap-5"}>
                {session?.user && <Link href={"/dashboard"} className={cn(linkClass("/dashboard"), "hidden md:inline")}>{NAV.dashboard}</Link>}

                {/* Phones: a dropdown like the account menu (founder's call), not a side sheet. */}
                <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant={"ghost"} size={"icon-sm"} aria-label={NAV.menu} className={"text-muted-foreground md:hidden"} />}>
                        <MenuIcon className={"size-5"} />
                    </DropdownMenuTrigger>
                    {/* Dashboard first when signed in, then the one action (founder, 2026-10-08), then the bar's four links
                        (founder, 15 Oct 2026). Sign in is the button beside the menu. */}
                    <DropdownMenuContent align={"end"} className={"w-56"}>
                        {session?.user && menuLink("/dashboard", <LayoutGridIcon className={"size-4 opacity-70"} />, NAV.dashboard)}
                        {/* Try it out: orange capitals in a thin orange outline, so it reads as a button, with a return key mark. */}
                        <DropdownMenuItem onClick={() => { track("cta_clicked", {where: "menu"}); scan.open(); }}
                                          className={"m-1 w-fit cursor-pointer gap-2 rounded-md border border-primary/45 px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] text-primary focus:border-primary focus:bg-primary/[0.06] focus:text-primary"}>
                            {NAV.withCv}<CornerDownLeftIcon className={"size-4 text-primary"} />
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {SITE_LINKS.map(({href, label, icon: Icon}) => menuLink(href, <Icon className={"size-4 opacity-70"} />, label))}
                    </DropdownMenuContent>
                </DropdownMenu>

                {session?.user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger render={(props) => (
                                <button {...props} aria-label={"Account"}>
                                    <Avatar>
                                        <AvatarImage src={session.user?.image ?? undefined} />
                                        <AvatarFallback className={"bg-primary text-white"}>{session.user?.name && (initials(session?.user?.name))}</AvatarFallback>
                                    </Avatar>
                                </button>
                            )}/>
                            <DropdownMenuContent align={"end"} className={"w-50"}>
                                <div className={"px-2 py-1.5 flex flex-col items-start gap-1"}>
                                    <p className={"text-sm font-medium"}>{session.user?.name}</p>
                                    <p className={"text-xs text-muted-foreground"}>{session.user?.email}</p>
                                </div>
                                <DropdownMenuSeparator />
                                <AccountMenuItems />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ): (
                    <Link
                        href={"/sign-in"}
                        className={"flex shrink-0 whitespace-nowrap rounded-md border border-border " +
                            "px-3 py-1.5 font-mono font-bold text-xs uppercase tracking-[0.12em] " +
                            "text-foreground transition-colors hover:border-primary/40"}
                    >
                        {NAV.signIn}
                    </Link>
                )}


            </div>
            {scan.sheet}
        </header>
    )
}
export default Navbar
