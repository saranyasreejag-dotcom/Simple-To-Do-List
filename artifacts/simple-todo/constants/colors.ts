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
    // Legacy aliases (kept for backward compatibility)
    text: '#183c34',
    tint: '#255848',

    // Core surfaces
    background: '#f5f3ea',
    foreground: '#183c34',

    // Cards / elevated surfaces
    card: '#fffef9',
    cardForeground: '#183c34',

    // Primary action color (buttons, links, active states)
    primary: '#255848',
    primaryForeground: '#fffef9',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#e8ebdd',
    secondaryForeground: '#255848',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#e8ebdd',
    mutedForeground: '#718176',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#dce979',
    accentForeground: '#183c34',

    // Destructive actions (delete, error states)
    destructive: '#a63f39',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#e0e3d7',
    input: '#dfe4d8',
  },

  dark: {
    text: '#f1f2e8',
    tint: '#dce979',
    background: '#14241f',
    foreground: '#f1f2e8',
    card: '#1d3029',
    cardForeground: '#f1f2e8',
    primary: '#dce979',
    primaryForeground: '#183c34',
    secondary: '#293d34',
    secondaryForeground: '#f1f2e8',
    muted: '#293d34',
    mutedForeground: '#a6b2a6',
    accent: '#35473a',
    accentForeground: '#dce979',
    destructive: '#f08378',
    destructiveForeground: '#14241f',
    border: '#33483e',
    input: '#33483e',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 18,
};

export default colors;
