import React from "react";

import p from "@/components/product/product.module.css";
import {ABOUT_PAGE} from "@/lib/site-copy";
import s from "./about.module.css";

const L = ABOUT_PAGE.ledger;

/** After "Your PDF is read, then deleted": what is kept when signed in, and what never is, on two sheets. */
export default function Ledger() {
    return (
        <div className={`${p.wrap} ${s.ledger}`} role={"group"} aria-label={L.label}>
            <div className={`${s.sheet} ${s.kept}`}>
                <p className={s.head}>{L.kept}</p>
                {L.groups.map((g) => (
                    <React.Fragment key={g.title}>
                        <p className={s.sub}>{g.title}</p>
                        <ul>{g.items.map((item) => <li key={item}>{item}</li>)}</ul>
                    </React.Fragment>
                ))}
                <p className={s.note}>{L.note}</p>
            </div>
            <div className={`${s.sheet} ${s.never}`}>
                <p className={s.head}>{L.never}</p>
                <ul>{L.neverItems.map((item) => <li key={item}>{item}</li>)}</ul>
                <p className={s.foot}>{L.foot}</p>
            </div>
        </div>
    );
}
