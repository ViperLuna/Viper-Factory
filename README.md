# Viper Factory: Plastic Works

A small clicker/idle plastic-factory game that runs entirely in the browser —
no build step, no server, just static HTML/CSS/JS. That makes it a good fit
for **GitHub Pages**, which is why this repo is set up to deploy there
automatically.

## Play it

Once this is merged to `main` and GitHub Pages is turned on for the repo
(**Settings → Pages → Source: GitHub Actions**), the included workflow
(`.github/workflows/deploy-pages.yml`) builds and publishes the site on every
push. No bundler, no `npm install` — it just uploads the static files.

To run it locally, you need a local web server (the game uses ES module
`<script type="module">` imports, which browsers block on `file://` URLs):

```bash
python3 -m http.server 8000
# or: npx serve .
```

Then open `http://localhost:8000`.

## How the game works

- **Buy machines** in the Shop (`B`). Real plastic-manufacturing processes:
  - **Injection Molder** — melts pellets and injects them into a mold. Good
    for small precise parts.
  - **Extruder** — continuously pushes melted plastic through a die. Good
    for pipe, sheet, rod stock.
  - **Blow Molder** — inflates a hot tube inside a mold. Good for hollow
    parts like bottles or tanks.
- A bought machine lands in your **hotbar** (bottom of screen, slots `1`-`9`).
  Press the number key (or click the slot) to select it, then click an empty
  pad on the factory floor to place it. Buy more machines than you have
  hotbar space for and the extras wait in **Inventory** (`I`).
- A placed machine does nothing until you **hire an operator** for it — click
  the machine and pay the one-time hire cost. Operators just stand there;
  they don't walk around. No operator, no production, regardless of material.
- Buy **pellets** at the Supply Depot (left side, via the Shop). Your
  **utility worker** automatically walks pellets from the depot to whichever
  staffed machine is running low.
- Finished pallets pile up at the machine until your **pallet jack worker**
  walks over, picks them up, and hauls them to the **Warehouse** (right
  side), which sells them for cash automatically.
- Click a running machine directly to give it a small one-off production
  boost — that's the "clicker" half of the game on top of the idle
  automation.
- Spend cash under **Upgrades & Staff** to hire a second utility worker or
  pallet jack operator, speed everyone up, carry bigger pellet loads, get a
  bulk pellet discount, or upgrade to a **towmotor** that carries two pallets
  at once.
- Progress autosaves to `localStorage` in your browser.

All the numbers (machine costs, cycle times, hopper sizes, upgrade costs,
worker speeds) live in one place: [`js/config.js`](js/config.js). Tweak them
there to rebalance the game without touching any logic.

## Project structure

```
index.html          Page shell + panels (shop, inventory, help)
css/style.css        All styling
js/config.js         Every tunable number and machine/upgrade definition
js/entities.js       Machine, UtilityWorker, Hauler classes + their behavior
js/state.js          Central game state, save/load, upgrade purchase logic
js/render.js         Canvas drawing (factory floor, depot, warehouse, sprites)
js/ui.js             DOM wiring for the shop/inventory/hotbar panels
js/main.js           Game loop, input handling, bootstraps everything
```

No frameworks, no build tooling — open a JS file and it's the whole story.

## Roadmap ideas (not built yet)

- **Assembly lines**: machines that produce *components* (e.g. a car body,
  a set of wheels) feeding into a conveyor belt that connects to an
  **assembly machine**, which combines components into a higher-value
  finished product (e.g. a toy car), each stage staffed by its own operator.
- A bigger, unlockable factory-floor grid (start small, buy more placement
  pads as you grow).
- More real-world processes as machine types: thermoforming, rotational
  molding.
- Real sprite art instead of the current vector-drawn placeholder shapes —
  `render.js` is the only file that would need to change.

## Why GitHub Pages (and alternatives)

GitHub Pages is a good fit here because the whole game is static files with
no backend — Pages just serves them over HTTPS for free, and the included
Actions workflow handles publishing automatically on every push to `main`.

Other options if you ever outgrow it or want something different:
- **itch.io**: upload a zipped build, get a game page with comments/ratings
  built in — popular for indie/browser games specifically.
- **Netlify / Vercel**: also free static hosting, with slightly faster
  preview-deploy workflows for pull requests if that matters to you later.
- **Self-hosting**: only worth it if you add a real backend (multiplayer,
  leaderboards, accounts) — not needed for this game as designed.

For a single-player browser game like this, GitHub Pages is the simplest
option and keeps the whole project (code + hosting) in one place.
