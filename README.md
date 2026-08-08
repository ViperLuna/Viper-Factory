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

A new save drops you into a short guided tutorial that walks through all of
this hands-on, one real step at a time — it advances as you actually do each
thing, not on a "next" button, and can be skipped anytime from its banner.

- **Machines vs. blueprints**: a machine (Extruder, Injection Molder, Blow
  Molder, Rotational Molder) is just an empty shell until you load a
  **blueprint** onto it — the actual recipe it runs. Buy the machine in
  **Shop → Machines**, buy the matching blueprint in **Shop → Blueprints**,
  then click the placed machine to load the blueprint onto it. A machine
  with no blueprint has nothing to build.
- **Machine licenses**: the Extruder is pre-licensed so you can start right
  away. Every other machine type needs a one-time license purchased first
  (shown right in the Machines tab); license price climbs with each tier.
  Buying additional units of a machine you're already licensed for also
  costs more each time.
- **Blueprints** (based on real plastic-manufacturing processes), roughly
  cheapest to most expensive:
  - **Extruder** — continuously pushes melted plastic through a die. Makes
    **Straws**. This is your first buy — no license needed.
  - **Injection Molder** — melts plastic and injects it into a mold. Makes
    **Toy Parts**.
  - **Blow Molder** — inflates a hot tube inside a mold. Makes **Bottles**.
  - **Rotational Molder** — tumbles powder in a heated rotating mold, built
    for big hollow items. Makes **Kayaks**. The most expensive machine and
    blueprint in the game.
- A bought machine lands in your **hotbar** (bottom of screen, slots `1`-`9`).
  Press the number key (or click the slot) to select it, then click an empty
  pad on the factory floor to place it. Buy more machines than you have
  hotbar space for and the extras wait in **Inventory** (`I`).
- **Shop → Workers** is where you hire everyone: a Utility Worker, a
  Warehouse Worker, and an Operator for each machine you place. All of it is
  one-time pay — no wages — but hiring another of the same kind always costs
  more than the last one did.
  - **Operators** are stationary — hire one per machine and it just stands
    there. No operator, no production, no matter how much plastic is in the
    hopper.
  - The **Utility Worker** walks plastic from the depot to whichever staffed
    machine is running low.
  - The **Warehouse Worker** walks finished pallets from machines to the
    warehouse to sell. Invest enough in their speed (or buy the Towmotor
    upgrade outright) and their sprite upgrades in place: on foot → pushing
    a hand cart → riding a towmotor with forks.
- Buy **plastic** in **Shop → Material** — one generic feedstock, no need to
  track types per machine.
- Click a running machine directly to give it a small one-off production
  boost — that's the "clicker" half of the game on top of the idle
  automation.
- **Shop → Upgrades** covers machine production speed, worker walking speed,
  bigger plastic loads per trip, a bulk plastic discount, and the towmotor
  upgrade.
- **Save Slots**: three independent slots, switchable from the "Save Slots"
  button. A slot only remembers what you *own* and what you've *earned* —
  which machines are placed and staffed, which blueprints and licenses you
  bought, how many workers you hired, and pallets already finished and
  waiting for pickup. It does **not** remember exactly where a worker was
  standing or how far into its cycle a machine was — reloading a slot looks
  like everyone just clocked in for a fresh shift, hoppers stocked and ready.
  The tutorial only ever shows up on a brand new slot.

All the numbers (machine costs, blueprint costs, license costs, cycle times,
hopper sizes, upgrade costs, worker speeds) live in one place:
[`js/config.js`](js/config.js). Tweak them there to rebalance the game
without touching any logic.

## Project structure

```
index.html          Page shell + panels (shop, inventory, slots, tutorial banner, help)
css/style.css        All styling
js/config.js         Every tunable number: machines, blueprints, upgrades, save slots
js/entities.js       Machine, UtilityWorker, Hauler classes + their behavior
js/state.js          Central game state, save-slot persistence, purchase logic
js/tutorial.js       The step list for the guided first-time tutorial
js/render.js         Canvas drawing (factory floor, depot, warehouse, sprites)
js/ui.js             DOM wiring for the shop/inventory/slots/tutorial UI
js/main.js           Game loop, input handling, bootstraps everything
```

No frameworks, no build tooling — open a JS file and it's the whole story.

## Roadmap ideas (not built yet)

- **Assembly kits**: some machines (starting with the Rotational Molder)
  would offer several blueprints instead of one — e.g. Frame, Swings,
  See-Saw, and Sliding Board, each individually sellable. A conveyor belt
  feeding into a new **assembly machine** (its own operator) would combine
  a full matching set into a single higher-value kit — a Swing Set, or a
  Playhouse built from doors/roof/windows/frame. An assembled kit always
  sells for more than the sum of its parts sold separately. The
  machine/blueprint split already in place is exactly the groundwork this
  needs — a Rotomolder just needs more than one ownable blueprint.
- **Warehouse expansion**: once the starting 4×3 factory-floor grid fills
  up, buy an upgrade to a bigger warehouse with more machine pads — likely
  paired with raising the worker-hire caps to match.
- Real sprite art (PNGs) instead of the current vector-drawn placeholder
  shapes — `render.js` is the only file that would need to change; machine
  and product icons are already centralized in `config.js`.

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
