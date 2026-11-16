# Ny Munkegade 80: scroll walk-through

A scroll-driven landing page for the apartment at Ny Munkegade. It opens on the architect's plan. Scrolling raises the walls, brings the camera down to the front door, and walks you into the rooms.

**Live:** https://holmstrom.github.io/3D_plan/ · planner: https://holmstrom.github.io/3D_plan/planner.html

**Checkpoint 2:** the whole walk.

1. Street photo of the building, zooming toward the door (only if `assets/img/street.jpg` exists).
2. Plan sheet, cut at 1.2 m.
3. Walls rise, camera comes down to the front door.
4. Hall, kitchen/dining, balcony door.
5. Child's room, living room with TV and bike trainer, master bedroom.
6. Walls sink back to the cut and the camera rises to the furnished plan.

## Indret selv (`planner.html`)

A small planner on the same model:

- **Plan:** drag furniture, turn it (R 90°, F 180°, Q/E 15°), mirror it (M), copy (Ctrl+D), delete. Arrow keys nudge 5 cm, with Shift 1 cm. The selected piece shows its size and the free distance to the nearest wall or furniture on each side, and turns red when it overlaps something.
- **Insert:** pick from the catalogue, or add your own piece with name, width, depth and height in cm and an optional photo, which is shown on its front.
- **Gå rundt:** walk through the rooms at eye height with W A S D or the arrow keys, drag to look around. Double-click the floor on the plan to stand there.
- The layout is saved in the browser and can be exported to and imported from a JSON file.

## Run it

You need any static file server, for example:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

There is no build step. three.js, GSAP + ScrollTrigger and Lenis are in `lib/`.

## How it works

- **The plan is the model.** Every vertex is clamped to a cut height `uCut` (`js/materials.js`).
  - At `uCut = 1.2 m`, seen from straight above through a 1.5° lens, the clamped tops of the walls read as black poché, and the rest reads as ink lines on paper.
  - Scrolling raises `uCut` to 2.5 m, which is the walls rising.
- **Line drawing to materials.** Every material is a normal PBR material, patched to show paper and ink until its room is revealed. Each room has a bounding box and a sweep direction (`ROOMS` in `js/model.js`). The reveal progress sweeps across the room in world space.
- **Layout.** This is version 2, as agreed:
  - Kitchen/dining with the table at the window.
  - Child's room on the balcony side.
  - TV room on the street side, with the bike trainer.
  - The master bedroom at the end of the hall.
- **Light.** It is late afternoon. The low sun comes from the street side. The garden side gets soft sky light, the pendant is lit, and so is the LED strip under the kitchen cabinets.

## Files

- `index.html`, `css/style.css`: the page, captions and scroll length.
- `js/main.js`: renderer, lights, camera path, scroll timeline.
- `js/model.js`: walls, windows, doors, furniture and plan annotations, in metres.
- `js/planner.js`, `js/catalog.js`, `planner.html`, `css/planner.css`: the planner and its furniture catalogue.
- `js/materials.js`: the cut/reveal shader patch and the materials.
- `assets/tex/`: CC0 textures from Poly Haven. `ash_planks`, `oak_honey`, `linen_neutral` and `cord_weave` are colour-adjusted versions of `oak_wood_planks`, `rough_linen` and `poly_wool_herringbone`.
- `assets/sky/`: CC0 sky from Poly Haven.
- `assets/img/street.jpg` (optional, not in this repo): put your own photo of the building there and the page opens on it, zooming toward the door before the plan appears.

## Recording mode

`?record` disables scrolling and exposes `window.__render(p)`, where `p` runs from 0 to 1 over the whole scroll. A headless browser can then render exact frames for a video.
