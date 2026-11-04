# 2026-10-05 — Glassbox name and logo, privacy pages, missing skills in red

**Files:** `frontend/src/components/brand/Logo.tsx`, `SiteFooter.tsx`,
`AccountMenuItems.tsx`, `LegalPage.tsx`, `app/(public)/` (privacy, your-cv),
`Navbar.tsx`, `Sidebar.tsx`, `app/layout.tsx`, `manifest.ts`,
`opengraph-image.tsx`, icons (`app/favicon.ico`, `icon.svg`, `apple-icon.png`,
`public/icons`, `public/brand`), `bits.tsx`, `OpportunityCard.tsx`,
`OpportunityPeek.tsx`, `SkillLandscape.tsx` (+ test), `globals.css`.

- **Glassbox:** the wordmark (GLASSBOX, the O drawn as the box) replaces the
  text "Jobradar." in the navbar, sidebar and landing footer, at the old
  visual size. Title, metadata, manifest, social card, favicon and app icons
  use the brand exports. The dot is `--logo-dot` (#f5532a on the desk,
  #b83a18 on paper). Code identifiers keep their names.
- **Privacy:** `/privacy` and `/your-cv` in short plain sentences, each
  statement checked against the code (`decisions/privacy-pages.md`, with
  three corrections to the brief). A footer on the landing page and a slim one
  on public pages: Privacy · What happens to your CV · Contact (shown when
  `NEXT_PUBLIC_CONTACT_EMAIL` is set) · © 2026 Glassbox.
- **Account menu,** the same everywhere: My profile · Your data · Theme ·
  Privacy · Sign out.
- **Opportunities:** a skill missing for that job is a soft red chip with a
  minus icon, never the action orange (`--missing`, `--missing-ink`).
  Market gaps stay grey (`decisions/design-system.md`).
- **/analysis landscape:** missing skills are dashed grey rings; lime marks
  one skill only.
