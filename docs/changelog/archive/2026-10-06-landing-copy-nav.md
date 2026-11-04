# 2026-10-06 — Landing copy, closing section, FAQ, header nav, /product and /about

**Files:** `frontend/src/components/landing/{copy.ts, copy.test.ts, CvSection.tsx, LowerSections.tsx, GlassSection.tsx, landing.css}`,
`components/Navbar.tsx`, `components/SiteFooter.tsx`, `lib/site-copy.ts`,
`app/(public)/product/page.tsx`, `app/(public)/about/page.tsx`, `app/sitemap.ts`,
shadcn `navigation-menu`, `sheet`.

Checked against `CLAUDE.md` section 2.

- **Copy** (brand owner's words): the hero line, "Every square is one job open
  today. Pick a job type.", the glass line, the closing section ("There's more of
  you in these jobs than you think."), three short "How we count" lines, "What
  you get with your CV" (each item nine words or fewer), The Count in two lines
  (its "First issue" note is gone).
- **Closing section:** headline left; a compact "Add your CV" (normal height, a
  small arrow) with "Sign up" as a text link; the lead "Free. One PDF. We keep the
  skills, not the file." under them in muted ink; the trust lines as one quiet row;
  the ad preview on the right, labelled "example" until a CV is in. The sticky bar
  uses the same compact button.
- **FAQ:** a shadcn Accordion titled "Questions", with "Why do I need to sign up?"
  added. The lower sections lost their chapter numbers; 01 and 02 stay on the
  count and the glass.
- **Header:** Product (a NavigationMenu: Market, Your skills, Opportunities,
  Applications, each with one line), How we count, About, FAQ, then Sign in. On a
  phone, a Sheet. Product links go to `/product#…`.
- **New pages:** `/product` (one section per feature, a screenshot slot each, the
  CV ask at the end) and `/about` (four short parts and the four values).
- **Footer:** Product, About, Privacy, What happens to your CV.
- **Tests:** the copy rules test now covers the new pages' words too, plus no
  hyphenated compounds, no "join" or "put yourself", no exclamation marks, and the
  nine word limit.

## Brand calls, same day

- Closing lead: "Free. One PDF. No account needed." The trust row is unchanged.
- FAQ: the two account questions are one, "Do I need an account?"
- `/product`'s "Add your CV" opens the same upload dialog as the landing page
  (`useCvScan`, now with an `onDone` that goes to `/analysis`). `cta_clicked`
  gains `where: product`.
- The closing preview shows the payoff before a CV is in: labelled "example",
  the two or three asks most jobs name are green ("on your CV"), the rest grey and
  hatched ("not on your CV yet"), with a legend and "In this example, 3 of the 5
  asks are on the CV." After a scan it shows the visitor's own skills only.
