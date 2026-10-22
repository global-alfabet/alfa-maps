# @alfa-maps/engine

The three.js engine both Alfa Maps apps use: the website's 3D hero (`apps/web`) and the estate app (`apps/app`).

| File | What it does |
| --- | --- |
| `util.js` | Polygon maths: bounding boxes, centroids, insets, frontage |
| `materials.js` | Shared materials and procedural textures |
| `builder.js` | Merges geometry by material so big estates stay fast |
| `house.js` | Parametric houses fitted to a plot (`buildStand`) |
| `presets.js` | The house types, wall and roof colours |
| `defaults.js` | Picks a sensible house for every plot (`fillHouses`, `defaultHouse`) |
| `estate.js` | The full interactive estate scene used by the app (`EstateScene`) |

Import by name, e.g. `import { buildStand } from "@alfa-maps/engine/house"`. `three` is a peer dependency: each app
installs it once.

Data uses the word "stand" internally (`stands`, `buildStand`) because that's what the surveyed plans call them. What
buyers see is set per estate in the app (`settings.unit`, "plot" by default).
