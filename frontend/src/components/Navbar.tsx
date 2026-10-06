'use client'

import React, {useState} from 'react'
import Link from "next/link";
import {
    ActivityIcon, ArrowRightIcon, CircleHelpIcon, ClipboardListIcon, InfoIcon, LayoutGridIcon, LogInIcon, LucideIcon, MenuIcon,
    RadarIcon, SigmaIcon, TrendingUpIcon,
} from "lucide-react";
import {usePathname, useRouter} from "next/navigation";
import {useSession} from "next-auth/react";
import {cn} from "@/lib/utils";
import {Button} from "@/components/ui/button";
import {
    NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {FEATURES, NAV} from "@/lib/site-copy";
import {useCvScan} from "@/components/landing/useCvScan";
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

const ICONS: Record<string, LucideIcon> = {
    market: ActivityIcon, "your-skills": TrendingUpIcon, opportunities: RadarIcon, applications: ClipboardListIcon,
};

/** One Product item: an icon tile, the name and one line. */
function FeatureItem({id}: {id: string}) {
    const f = FEATURES.find((x) => x.id === id)!;
    const Icon = ICONS[id];
    return (
        <span className={"flex w-full items-center gap-3"}>
            <span className={"flex size-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground"}>
                <Icon className={"size-4"} />
            </span>
            <span className={"flex min-w-0 flex-1 flex-col"}>
                <span className={"text-sm font-medium text-foreground"}>{f.title}</span>
                <span className={"text-[13px] leading-snug text-muted-foreground"}>{f.nav}</span>
            </span>
        </span>
    );
}

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

    // The dashboard needs an account, so its link shows only when signed in.
    const siteLinks = [{href: "/#how-we-count", label: NAV.how}, {href: "/about", label: NAV.about}, {href: "/#faq", label: NAV.faq}];
    const linkClass = (href: string) => cn(
        "font-mono text-xs uppercase tracking-[0.12em] transition-colors",
        pathname === href ? "text-foreground" : "text-muted-foreground hover:text-foreground"
    );
    const menuLink = (href: string, icon: React.ReactNode, label: string) => (
        <DropdownMenuItem key={href} render={(props) => (
            <Link {...props} href={href} className={cn(props.className, "cursor-pointer")}>{icon} {label}</Link>
        )} />
    );
    const withCv = (close?: () => void) => (
        <Button variant={"ghost"} onClick={() => { close?.(); scan.open(); }}
                className={"group h-auto w-full justify-between px-3 py-2.5 text-sm font-normal"}>
            <span>{NAV.withCv}</span><ArrowRightIcon className={"size-3.5 text-primary transition-transform group-hover:translate-x-0.5"} />
        </Button>
    );

    return (
        <header className={"flex items-center justify-between gap-4 px-5 py-5 lg:px-8"}>
            <div className={"flex items-center gap-8"}>
                <Link href={"/"} aria-label={"Glassbox home"} className={"block w-fit"}>
                    {/* Logo exception: the size of the old 24px text wordmark's capitals. */}
                    <GlassboxWordmark className={"h-[17px] w-auto"} />
                </Link>
                <nav aria-label={"Main"} className={"relative hidden items-center gap-5 md:flex"} onPointerLeave={() => setPill(null)}>
                    {/* A soft pill that slides to the item under the pointer (Supabase's top level indicator). */}
                    <span aria-hidden className={"pointer-events-none absolute -inset-y-1.5 rounded-md bg-foreground/[0.06] transition-[left,width,opacity] duration-200 ease-out motion-reduce:transition-none"}
                          style={{left: (pill?.left ?? 0) - 10, width: (pill?.width ?? 0) + 20, opacity: pill ? 1 : 0}} />
                    <NavigationMenu>
                        <NavigationMenuList>
                            <NavigationMenuItem>
                                <NavigationMenuTrigger onPointerEnter={pillTo} className={"h-auto bg-transparent px-0 py-0 font-mono text-xs font-normal uppercase tracking-[0.12em] text-muted-foreground hover:bg-transparent hover:text-foreground data-popup-open:bg-transparent data-open:bg-transparent"}>
                                    {NAV.product}
                                </NavigationMenuTrigger>
                                <NavigationMenuContent>
                                    <div className={"w-[min(600px,calc(100vw-48px))] p-2"}>
                                        <p className={"px-3 pt-2 pb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground"}>{NAV.product}</p>
                                        <ul className={"grid grid-cols-2 gap-1"}>
                                            {FEATURES.map((f) => (
                                                <li key={f.id}>
                                                    <NavigationMenuLink render={<Link href={`/product#${f.id}`} />} className={"spotlight block rounded-lg border border-transparent p-3 transition-colors hover:border-border"}>
                                                        <FeatureItem id={f.id} />
                                                    </NavigationMenuLink>
                                                </li>
                                            ))}
                                        </ul>
                                        <div className={"mt-1 border-t border-border pt-1"}>{withCv()}</div>
                                    </div>
                                </NavigationMenuContent>
                            </NavigationMenuItem>
                        </NavigationMenuList>
                    </NavigationMenu>
                    {siteLinks.map((link) => <Link key={link.href} href={link.href} onPointerEnter={pillTo} className={cn(linkClass(link.href), "relative")}>{link.label}</Link>)}
                </nav>
            </div>

            <div className={"flex items-center gap-5"}>
                {session?.user && <Link href={"/dashboard"} className={cn(linkClass("/dashboard"), "hidden md:inline")}>{NAV.dashboard}</Link>}

                {/* Phones: a dropdown like the account menu (founder's call), not a side sheet. */}
                <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant={"ghost"} size={"icon-sm"} aria-label={NAV.menu} className={"text-muted-foreground md:hidden"} />}>
                        <MenuIcon className={"size-5"} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={"end"} className={"w-56"}>
                        {FEATURES.map((f) => {
                            const Icon = ICONS[f.id];
                            return menuLink(`/product#${f.id}`, <Icon className={"size-4 opacity-70"} />, f.title);
                        })}
                        <DropdownMenuItem onClick={() => scan.open()} className={"cursor-pointer"}>
                            <ArrowRightIcon className={"size-4 text-primary"} /> {NAV.withCv}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {menuLink("/#how-we-count", <SigmaIcon className={"size-4 opacity-70"} />, NAV.how)}
                        {menuLink("/about", <InfoIcon className={"size-4 opacity-70"} />, NAV.about)}
                        {menuLink("/#faq", <CircleHelpIcon className={"size-4 opacity-70"} />, NAV.faq)}
                        <DropdownMenuSeparator />
                        {session?.user
                            ? menuLink("/dashboard", <LayoutGridIcon className={"size-4 opacity-70"} />, NAV.dashboard)
                            : menuLink("/sign-in", <LogInIcon className={"size-4 opacity-70"} />, NAV.signIn)}
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
            {scan.dialog}
        </header>
    )
}
export default Navbar
