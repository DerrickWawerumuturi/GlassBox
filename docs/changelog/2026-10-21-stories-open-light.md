# 2026-10-21: stories open on paper

The founder asked for the light background as the default on every story. A story page now paints light before
first paint unless the reader chose Dark in the theme menu; the rest of the site still follows the system setting.
Checked in a browser set to dark: both stories light, /market/entry-level-software and / dark, a link into a story
turns it light and back turns it dark. Tests: `lib/theme.test.ts` (fails without the change). Decision:
`docs/decisions/design-system.md` ("Stories open on paper"). Cost: none.
