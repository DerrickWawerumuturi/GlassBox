import Image from "next/image";

import {cn} from "@/lib/utils";

/*
 * A screenshot of the product (public/product, made by docs/local/render/product-shots.mjs
 * with the example scan, no personal data). Two images, one per theme: the
 * site's own theme decides (the .dark class), not only the system's.
 */

export type ShotName = "overview" | "market" | "market-demand" | "skills" | "opportunities" | "applications" | "upload";

const SIZE = {desktop: {width: 2880, height: 1800}, phone: {width: 780, height: 1688}};

export default function ProductShot({name, device = "desktop", alt, sizes, priority, className}: {
    name: ShotName; device?: "desktop" | "phone"; alt: string; sizes: string; priority?: boolean; className?: string;
}) {
    const {width, height} = SIZE[device];
    const common = {width, height, sizes, priority, alt, className: "h-auto w-full"};
    return (
        <span className={cn("block overflow-hidden rounded-xl border border-border bg-card shadow-[0_18px_50px_-24px_rgb(0_0_0/0.45)]", className)}>
            <Image src={`/product/${name}-${device}-light.webp`} {...common} className={cn(common.className, "dark:hidden")} />
            <Image src={`/product/${name}-${device}-dark.webp`} {...common} className={cn(common.className, "hidden dark:block")} />
        </span>
    );
}
