# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wedding website for Dana and Jaicob. Statically generated site designed for hosting on S3, GitHub Pages, or similar platforms. No backend server.

## Requirements (from prd.txt)

### Pages
- **Password** — gate page with client-side password protection (must not expose password in static files, no external services/API calls)
- **Home** — date, location, countdown timer, couple's message, RSVP link
- **Our Story** — interactive hotspot-based narrative; completing all hotspots unlocks a message
- **Travel** — utilitarian info page (flights, hotels, arrival/departure recommendations)
- **Schedule** — day-of timeline
- **Registry** — message from couple + external link

### Key Technical Requirements
- **Static site generation** — no server-side runtime
- **Tailwind CSS** (latest version) with theme override placeholders; local font files
- **Localization** — English (default) and Korean via separate language files
- **Animations** — smooth lazy-load, scroll-into-view, and page transitions; must not feel sluggish
- **Password protection** — client-side only, password must not be readable from static files (e.g., use hashing)

### Theme Colors
| Role       | Value     |
|------------|-----------|
| Background | `#f0ecdf` |
| Foreground | `#342412` |
| Accent     | `#2352b8` |

Derive all other colors as shades/variations of these three — avoid introducing new hues.


## Stack

- **Vite** — build tool and dev server
- **Vanilla JS** — no framework; direct DOM manipulation
- **GSAP** — all animations and page transitions
- **Tailwind CSS v4** — styling via CSS-first `@theme` config

## Commands

- `npm run dev` — start dev server (Vite)
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the production build locally

## Architecture

```
src/
  pages/        *.html (markup) + *.js (behavior, imports html via ?raw)
  components/   header.js (nav, language toggle)
  utils/        auth.js (SHA-256 password), router.js (hash SPA router), i18n.js
  i18n/         en.json, ko.json
  styles/       main.css (Tailwind @theme, animations)
public/fonts/   local font files (placeholder — user must add)
```

**Page pattern:** each page is a `{ html, init(container), guard?() }` object. HTML is a raw-imported `.html` partial. `init()` binds events, sets i18n text, and runs GSAP entrance animations. `guard()` optionally blocks navigation (used for auth gating).

**Password protection:** plaintext password lives in `.env` (`PASSWORD=...`). Vite config hashes it at build time with Node's `crypto` and injects the hash via `define: { __PASSWORD_HASH__ }`. Only the hash appears in the build output.

**Routing:** minimal hash-based SPA router (`#/home`, `#/story`, etc.). Supports `beforeNavigate`/`afterNavigate` hooks for GSAP page transitions.

**i18n:** `t('key.path')` resolves from the active locale's JSON. Language toggle re-renders the current page.


# Stardew Valentines Day Card
In celebration of valentines day I want to make a stardew valley style valentines days experience for my fiance. The experience should be the following. 1) A title screen shows with the title "Love in Lyon" 2) A female character with shoulder length black hair and korean skin tone with brown pajamas on wakes up in a bed in the cabin. 3) They walk out and there is a heart shaped garden of roses. In the middle there is a mailbox with a indicator that there is a message. They walk to the mailbox and open the letter of which I will write a custom message. The surrounding landscape should be pretty, lots of trees water from spring time. This should all compile as a static website still but we can use other libraries as needed. You can find the assets, sprites and spritesheets at https://www.spriters-resource.com/pc_computer/stardewvalley/ and may search and download from this site as needed.

Sprite Plan
- Cabin: “pelican-town.png” row 5 of assets, 3rd building over, the small house with the green roof
- Indoor floor: wood floor and heart wall paper from https://www.spriters-resource.com/pc_computer/stardewvalley/asset/88659/
- Indoor decor: bed, and objects from “furniture.png”
- Outdoor tiles: “outdoors-spring.png” ground is mostly in the top left.
- Trees: the first half of first row of “outdoors-spring” are all usable sprites.
- Flowers: about two thirds the way down “crops.png” use the sunflowers.
- Player: keep it simple, use the character parts on the first row. The clothes and hair will need to be composed, use the hair in the 10th row of hair and the 6th columnmn. Use the blue shirt on the 3 row 12 th col of shirts, use the first row of pants (in the same row as the body. Each set of body, shirt, hair, pants has a sprite for facing forward, backward, left and right, and when moving the legs/shoes will cycle a walking animation. 

# Workflow
1. Compose the character
2. Build out the movement animations
3. Check that each body part, arms,  hair, shirt, pants, shoes is composed and works for forward, backward, left and right facing
4. Update the map/floor to use the prescribed tiles
5. Update the cabin interior to use the correct furniture
6. Update the outdoor cabin
7. Update trees and bushes
8. Update flowers


