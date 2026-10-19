import React from "react";
import Link from "next/link";

import AddCvButton from "@/components/AddCvButton";
import PhoneHandoff from "@/components/cv-ask/PhoneHandoff";
import type {CtaPlace} from "@/lib/analytics";
import {PRODUCT_PAGE as P} from "@/lib/site-copy";
import s from "./product.module.css";

/**
 * The close of /product and /about: the CV card from the market home, its
 * question, Add your CV and Sign up; on a phone or tablet, the link to take
 * to a laptop under them (PhoneHandoff).
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
                <PhoneHandoff where={where} className={"mt-3"} />
            </div>
        </section>
    );
}
