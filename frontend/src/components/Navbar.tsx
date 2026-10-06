'use client'

import React, {useState} from 'react'
import Link from "next/link";
import {MenuIcon} from "lucide-react";
import {usePathname} from "next/navigation";
import {useSession} from "next-auth/react";
import {useAnalysis} from "@/lib/analysis-store";
import {useCv} from "@/lib/cv-store";
import {cn} from "@/lib/utils";
import {Button} from "@/components/ui/button";
import {
    NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {Sheet, SheetContent, SheetTitle, SheetTrigger} from "@/components/ui/sheet";
import {FEATURES, NAV} from "@/lib/site-copy";
import {
    DropdownMenu,
    DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {initials} from "@/lib/utils";
import {GlassboxWordmark} from "@/components/brand/Logo";
import AccountMenuItems from "@/components/AccountMenuItems";

const Navbar = () => {
    const {data: session} = useSession();
    const {analysis} = useAnalysis();
    const {cv} = useCv();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    // The dashboard brings its own shell — a second header would fight the sidebar.
    if (pathname.startsWith("/dashboard")) return null;

    // Signed in is enough for the dashboard link: the CV may live on the
    // account rather than in this browser. Nothing sends anyone there for them.
    const productLinks = [
        ...(session || cv || analysis ? [{href: "/dashboard", label: "Dashboard"}] : []),
        ...(cv ? [{href: "/onboarding", label: "Profile"}] : []),
        ...(analysis ? [{href: "/analysis", label: "Analysis"}] : []),
    ];

    // The public site, for everyone; the product links join them once there is something to open.
    const siteLinks = [{href: "/#how-we-count", label: NAV.how}, {href: "/about", label: NAV.about}, {href: "/#faq", label: NAV.faq}];
    const links = [...siteLinks, ...productLinks];
    const linkClass = (href: string) => cn(
        "font-mono text-xs uppercase tracking-[0.12em] transition-colors",
        pathname === href ? "text-foreground" : "text-muted-foreground hover:text-foreground"
    );

    return (
        <header className={"flex items-center justify-between gap-4  px-5 py-5 lg:px-8"}>
            <div className={"flex flex-col gap-1"}>
                <Link href={"/"} aria-label={"Glassbox home"} className={"block w-fit"}>
                    {/* Logo exception: the size of the old 24px text wordmark's capitals. */}
                    <GlassboxWordmark className={"h-[17px] w-auto"} />
                </Link>
            </div>


            <div className={"flex items-center gap-5"}>
                <nav aria-label={"Main"} className={"relative hidden items-center gap-5 md:flex"}>
                        <NavigationMenu>
                            <NavigationMenuList>
                                <NavigationMenuItem>
                                    <NavigationMenuTrigger className={"h-auto bg-transparent px-0 py-0 font-mono text-xs font-normal uppercase tracking-[0.12em] text-muted-foreground hover:bg-transparent hover:text-foreground data-popup-open:bg-transparent data-open:bg-transparent"}>
                                        {NAV.product}
                                    </NavigationMenuTrigger>
                                    <NavigationMenuContent>
                                        <ul className={"grid w-[440px] grid-cols-2 gap-1 p-1"}>
                                            {FEATURES.map((f) => (
                                                <li key={f.id}>
                                                    <NavigationMenuLink render={<Link href={`/product#${f.id}`} />} className={"flex flex-col items-start gap-1 rounded-md p-3 hover:bg-muted"}>
                                                        <span className={"text-sm font-medium text-foreground"}>{f.title}</span>
                                                        <span className={"text-[13px] leading-snug text-muted-foreground"}>{f.nav}</span>
                                                    </NavigationMenuLink>
                                                </li>
                                            ))}
                                        </ul>
                                    </NavigationMenuContent>
                                </NavigationMenuItem>
                            </NavigationMenuList>
                        </NavigationMenu>
                        {links.map((link) => (
                            <Link key={link.href} href={link.href} className={linkClass(link.href)}>{link.label}</Link>
                        ))}

                        {pathname === "/" && productLinks.length >= 2 && (
                            <div
                                aria-hidden
                                className={"pointer-events-none absolute left-1/2 top-full hidden -translate-x-1/2 select-none flex-col items-center pt-1 sm:flex"}
                            >
                                <svg viewBox={"0 0 80 34"} fill={"none"} className={"h-8 w-20 text-primary/80"}>
                                    <path d={"M40 32 C 37 21, 26 13, 12 8"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} />
                                    <path d={"M11 17 L 11 7 L 21 6"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} />
                                    <path d={"M40 32 C 43 21, 54 13, 68 8"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} />
                                    <path d={"M69 17 L 69 7 L 59 6"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} />
                                </svg>
                                <span className={"-rotate-2 whitespace-nowrap font-hand text-xl leading-none text-primary/90"}>
                                    a bigger picture of you
                                </span>
                            </div>
                        )}
                </nav>

                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                    <SheetTrigger render={<Button variant={"ghost"} size={"icon-sm"} aria-label={NAV.menu} className={"text-muted-foreground md:hidden"} />}>
                        <MenuIcon className={"size-5"} />
                    </SheetTrigger>
                    <SheetContent side={"right"} className={"gap-6 p-6"}>
                        <SheetTitle className={"font-mono text-[11px] font-normal uppercase tracking-[0.12em] text-muted-foreground"}>{NAV.menu}</SheetTitle>
                        <nav aria-label={"Main"} className={"flex flex-col gap-5"}>
                            <div className={"flex flex-col gap-3"}>
                                <span className={"font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground"}>{NAV.product}</span>
                                {FEATURES.map((f) => (
                                    <Link key={f.id} href={`/product#${f.id}`} onClick={() => setMenuOpen(false)} className={"flex flex-col"}>
                                        <span className={"text-[15px] font-medium"}>{f.title}</span>
                                        <span className={"text-[13px] text-muted-foreground"}>{f.nav}</span>
                                    </Link>
                                ))}
                            </div>
                            <div className={"flex flex-col gap-3 border-t border-border pt-5"}>
                                {links.map((link) => <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className={"text-[15px] font-medium"}>{link.label}</Link>)}
                            </div>
                        </nav>
                    </SheetContent>
                </Sheet>

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
        </header>
    )
}
export default Navbar
