/**
 * Headline-level positioning copy, in one place.
 *
 * The company works across the whole user-generated content space, and that
 * space reshuffles constantly: a platform that carries most of the audience
 * this year may not next year. So the rule this module exists to hold is:
 *
 *   headline copy describes the space, never a single platform
 *
 * Specific platforms are still named, and should be: they are what makes the
 * claim concrete. They belong in secondary example lists, feature copy, FAQ
 * answers and capability enumerations, where adding or dropping one is a
 * one-word edit rather than a repositioning of the company.
 *
 * tests/unit/positioning.test.tsx enforces this against the rotating taglines
 * and every heading the pages render.
 *
 * Scope note: the page title and meta description are deliberately not here.
 * PR #13 moves page metadata into lib/seo/routes.ts and rewords the title in
 * the same pass, so owning those strings here too would be the same decision
 * made in two places. Once that lands, pointing the guard at the manifest's
 * titles and descriptions is a two-line follow-up.
 */

/**
 * Platform and product names that must not appear in headline copy.
 *
 * Matched case-insensitively on word boundaries, so this list is the exact
 * vocabulary the guard knows about. Adding a platform here is how a new one
 * gets the same protection; nothing else has to change.
 */
export const PLATFORM_NAMES: readonly string[] = [
  'Fortnite',
  'UEFN',
  'Unreal',
  'Epic Games',
  'Roblox',
  'Minecraft',
  'Rec Room',
  'Discord',
  'TikTok',
  'YouTube',
  'Twitch',
];

/**
 * Example platform lists for use in body copy. Named once so the page agrees
 * with itself about which platforms get called out, and so the ordering never
 * reads as a ranking the company has not actually committed to.
 */
export const PLATFORM_EXAMPLES = {
  /** In-game creation surfaces. */
  games: 'Fortnite and UEFN, Roblox, Minecraft',
  /** Where the audience gathers around the games. */
  social: 'Discord, YouTube, TikTok',
} as const;

/**
 * The rotating hero taglines. Each is read on its own, so each has to stand on
 * its own: none of them can be the one that quietly narrows the company to a
 * single platform for whoever happens to land on it.
 */
export const TAGLINES: readonly string[] = [
  'Build Authentic Player Communities',
  'Scale Your Gaming Brand Presence',
  'Create Lasting Player Relationships',
  'Transform Communities into Revenue Engines',
  'Lead Across Every UGC Ecosystem',
  'Elevate Community Engagement',
  'Turn Attention into Brand Loyalty',
  'Master Creator Community Growth',
  'Build the Ultimate Player Experience',
  'Lead Your Industry Where Players Create',
];
