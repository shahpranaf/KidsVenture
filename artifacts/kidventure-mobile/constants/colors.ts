/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#18324b',
    tint: '#ff8a3d',
    background: '#fff9f0',
    foreground: '#18324b',
    card: '#ffffff',
    cardForeground: '#18324b',
    primary: '#ff7a45',
    primaryForeground: '#ffffff',
    secondary: '#e9f7f2',
    secondaryForeground: '#18324b',
    muted: '#f2eadf',
    mutedForeground: '#6f7c84',
    accent: '#ffd15c',
    accentForeground: '#18324b',
    destructive: '#e85d68',
    destructiveForeground: '#ffffff',
    border: '#eadfce',
    input: '#eadfce',
    navy: '#18324b',
    cream: '#fff9f0',
    sky: '#dff3ff',
    mint: '#dcf5ec',
    lavender: '#eee5ff',
    blush: '#ffe5e1',
    yellow: '#ffd15c',
    learn: '#55a9e8',
    create: '#9a74dc',
    connect: '#eb6e8c',
    success: '#43b883',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 22,
};

export default colors;
