# Design System Strategy: Neon Kineticism

## 1. Overview & Creative North Star
**The Creative North Star: "Hyper-Link Connectivity"**
This design system moves away from the static, boxy layouts of traditional gaming hubs to embrace a high-energy, liquid-motion aesthetic. We are designing for "The Duel"—a two-player centric experience that feels like a live broadcast. The interface should feel like a living organism powered by neon light, utilizing intentional asymmetry to guide the eye toward action. We break the "template" look by overlapping display typography with UI containers and using aggressive contrast between deep void surfaces and electric accents.

## 2. Colors & Surface Philosophy
The palette is built on a "Void and Glow" architecture. We use deep saturations of purple to create depth and neon strikes of blue and green to signify life and interaction.

*   **The "No-Line" Rule:** Standard 1px borders are strictly prohibited for sectioning. Boundaries must be defined through background color shifts. For example, a `surface-container-low` (#10131a) sidebar should sit against a `surface` (#0b0e14) main stage. Use the `8` (2rem) or `12` (3rem) spacing tokens to create breathing room that acts as a structural divider.
*   **Surface Hierarchy & Nesting:** Treat the UI as stacked sheets of tinted glass. 
    *   **Base:** `surface` (#0b0e14)
    *   **Primary Containers:** `surface-container` (#161a21)
    *   **Active Elements:** `surface-container-high` (#1c2028)
*   **The "Glass & Gradient" Rule:** Floating overlays (modals, player stats) must use `surface-bright` (#282c36) with a 60% opacity and a `backdrop-blur` of 20px. 
*   **Signature Textures:** For main CTA backgrounds and Hero states, use a linear gradient from `primary` (#cf96ff) to `primary-dim` (#a533ff) at a 135-degree angle. This adds a "soul" to the UI that flat colors cannot replicate.

## 3. Typography
The typography strategy pairings create a "Pro-Sports Editorial" feel.

*   **The Voice (Space Grotesk):** Used for `display` and `headline` tiers. It is a technical, wide-set sans-serif that feels high-energy and "digital-first." Use `display-lg` (3.5rem) for player scores or match announcements, often overlapping the edge of a container to break the grid.
*   **The Engine (Plus Jakarta Sans):** Used for `title`, `body`, and `label` tiers. It is highly legible and modern, providing the "clean" balance to the "playful" headlines.
*   **Visual Hierarchy:** Always pair a `headline-lg` in uppercase with a `label-md` in `secondary` (#00e3fd) to create a clear "Level/Value" relationship common in gaming huds.

## 4. Elevation & Depth
We eschew traditional drop shadows for **Tonal Layering** and **Luminescent Glows**.

*   **The Layering Principle:** Depth is achieved by "stacking." A `surface-container-lowest` (#000000) card placed on a `surface-container-low` (#10131a) section creates a "sunken" interactive area.
*   **Ambient Shadows:** For floating elements, use a diffused glow rather than a shadow. The shadow color must be a 10% opacity version of `primary` (#cf96ff) with a 40px blur, mimicking the light bleed of a neon sign.
*   **The "Ghost Border" Fallback:** If a container requires definition against a complex background, use `outline-variant` (#45484f) at 15% opacity. Never use 100% opaque lines.
*   **Motion Depth:** Interactive elements should scale (1.02x) on hover, revealing a `secondary` (#00e3fd) outer glow to simulate the element "powering up."

## 5. Components

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary-dim`). Border-radius: `full`. Typography: `label-md` bold.
*   **Secondary:** No fill. "Ghost Border" (20% opacity `secondary`). Text color: `secondary` (#00e3fd).
*   **Tertiary:** No fill, no border. Underline using a 2px `secondary` stroke that only spans 50% of the text width, centered.

### Cards & Player Slots
*   **Forbid Dividers:** Use `spacing-6` (1.5rem) to separate content. 
*   **Two-Player Asymmetry:** In a versus view, use `surface-container-high` for Player 1 and a slightly shifted `surface-container-highest` for Player 2 to create a subtle visual tension.
*   **Interactive State:** On hover, the card should transition its background to a 5% opacity `primary` tint.

### Inputs & Search
*   **Field Style:** `surface-container-lowest` background. No border. On focus, a bottom-only 2px stroke of `secondary` (#00e3fd) "grows" from the center out.
*   **Error State:** Use `error` (#ff6e84) for text and icons, but the container background should shift to a subtle `error_container` (#a70138) at 10% opacity.

### Additional Signature Components
*   **The "Vs" Badge:** A floating `display-sm` element using an italicized `Space Grotesk`, positioned at the intersection of two player containers.
*   **Glow-Chips:** Small status indicators (e.g., "Online") that use `tertiary` (#8eff71) with a soft 4px outer glow of the same color.

## 6. Do's and Don'ts

### Do
*   **Do** use extreme scale. Make scores huge (`display-lg`) and metadata tiny (`label-sm`).
*   **Do** use `tertiary` (#8eff71) exclusively for "Success," "Win," and "Ready" states. It is the highest-energy color in the system.
*   **Do** allow elements to bleed off the edge of the screen on mobile to imply a larger "world" of content.

### Don't
*   **Don't** use pure white (#FFFFFF). Always use `on-surface` (#ecedf6) to maintain the dark-mode's retinal comfort.
*   **Don't** use standard "cards with shadows." Use background color shifts and nested surfaces.
*   **Don't** use sharp corners. Stick to the `md` (0.75rem) or `full` roundedness scale to keep the "playful" vibe.