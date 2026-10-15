import React from "react";
import Link from "next/link";

import AddCvButton from "@/components/AddCvButton";
import type {CtaPlace} from "@/lib/analytics";
import {PRODUCT_PAGE as P} from "@/lib/site-copy";
import s from "./product.module.css";

/**
 * The close of /product and /about: the CV card from the market home, its
 * question, Add your CV and Sign up.
 */
export default function CvClose({where}: {where: CtaPlace}) {
    return (
        <section className={`${s.close} ${s.wrap}`}>
            <div className={s.cvcard}>
                <h2>{P.closing}</h2>
                <div className={s.acts}>
                    <AddCvButton label={P.cta} reading={P.reading} where={where} />
                    <Link className={s.plain} href={"/sign-in"}>{P.signUp}</Link>
                </div>
            </div>
        </section>
    );
}
