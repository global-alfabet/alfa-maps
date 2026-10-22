"""
Generates the fictional demo estate used on the website (apps/web/src/data/demo-estate.json)
and as the app's starting estate (apps/app/seed/estate.json).
Curved residential streets, back-to-back stands, a cross street and a park. Not based on any real development.

  python tools/make_demo_estate.py
"""
import json
import math
import random
from pathlib import Path

random.seed(7)
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "apps" / "web" / "src" / "data" / "demo-estate.json"
APP_SEED = ROOT / "apps" / "app" / "seed" / "estate.json"

ROAD = 12.0            # street width (m)
HW = ROAD / 2
SPACING = 94.0         # centreline to centreline: two 41 m deep stands back to back
X0, X1 = -230.0, 230.0
CROSS = [-70.0, 95.0]  # cross streets (x of centreline)
PARK = (1, CROSS[0], CROSS[1])  # block index 1, between the two cross streets


def street(k, x):
    """Gently curving street centreline k (z as a function of x)."""
    return k * SPACING + 14 * math.sin(x / 95 + 0.6) + 5 * math.sin(x / 41)


def segments():
    """x-ranges of each block between cross streets."""
    edges = [X0] + [c for c in CROSS] + [X1]
    out = []
    for i in range(len(edges) - 1):
        a = edges[i] + (HW if i > 0 else 0)
        b = edges[i + 1] - (HW if i < len(edges) - 2 else 0)
        out.append((a, b, i > 0, i < len(edges) - 2))
    return out


def split(a, b):
    """Split a frontage run into stand widths of 15–23 m."""
    xs = [a]
    while b - xs[-1] > 30:
        xs.append(xs[-1] + random.uniform(15, 23))
    xs.append(b)
    return xs


stands, opens = [], []
for k in range(4):  # blocks between street k and k+1
    for (a, b, road_left, road_right) in segments():
        top = lambda x: street(k, x) + HW                      # front of the lower row faces street k
        bot = lambda x: street(k + 1, x) - HW                  # front of the upper row faces street k+1
        mid = lambda x: (top(x) + bot(x)) / 2
        if k == PARK[0] and a >= PARK[1] and b <= PARK[2]:
            n = 12
            poly = [[a + (b - a) * i / n, top(a + (b - a) * i / n)] for i in range(n + 1)]
            poly += [[b - (b - a) * i / n, bot(b - (b - a) * i / n)] for i in range(n + 1)]
            opens.append({"poly": [[round(x, 2), round(z, 2)] for x, z in poly]})
            continue
        xs = split(a, b)
        for row in ("low", "high"):
            for j in range(len(xs) - 1):
                xa, xb = xs[j], xs[j + 1]
                if row == "low":   # front on street k (z small), back on the mid line
                    poly = [[xa, top(xa)], [xb, top(xb)], [xb, mid(xb)], [xa, mid(xa)]]
                else:              # front on street k+1, back on the mid line
                    poly = [[xb, bot(xb)], [xa, bot(xa)], [xa, mid(xa)], [xb, mid(xb)]]
                first, last = j == 0, j == len(xs) - 2
                left_road = (road_left and first) if row == "low" else (road_right and last)
                right_road = (road_right and last) if row == "low" else (road_left and first)
                edges_kind = ["road", "road" if right_road else "neighbour", "neighbour", "road" if left_road else "neighbour"]
                stands.append({"poly": poly, "kinds": edges_kind, "row": row, "k": k})

def area(P):
    return abs(sum(P[i][0] * P[(i + 1) % len(P)][1] - P[(i + 1) % len(P)][0] * P[i][1] for i in range(len(P)))) / 2


def centroid(P):
    return (sum(p[0] for p in P) / len(P), sum(p[1] for p in P) / len(P))


# featured stand: a corner stand next to the park, near the middle
cands = [s for s in stands if s["k"] in (0, 2) and "road" in s["kinds"][1:]]
hero = min(cands, key=lambda s: math.dist(centroid(s["poly"]), (CROSS[0] + 20, SPACING * 1.5)))
hc = centroid(hero["poly"])
stands.sort(key=lambda s: math.dist(centroid(s["poly"]), hc))

out = []
for i, s in enumerate(stands):
    P = [[round(x - hc[0], 2), round(z - hc[1], 2)] for x, z in s["poly"]]
    edges = []
    for e, kind in enumerate(s["kinds"]):
        a, b = P[e], P[(e + 1) % 4]
        d = {"kind": kind, "length": round(math.dist(a, b), 2)}
        if kind == "road":
            d["width"] = int(ROAD)
        edges.append(d)
    out.append({
        "no": str(101 + i),
        "size": round(area(P)),
        "status": "available" if (i == 0 or i % 5 == 2) else "sold",
        "numbered": True,
        "poly": P,
        "edges": edges,
    })
op = [{"poly": [[round(x - hc[0], 2), round(z - hc[1], 2)] for x, z in o["poly"]]} for o in opens]
text = json.dumps({"hero": "101", "stands": out, "open": op}, separators=(",", ":"))
OUT.write_text(text)
APP_SEED.write_text(text)
sizes = [s["size"] for s in out]
print(f"{len(out)} stands ({min(sizes)}–{max(sizes)} m²), {len(op)} park(s) → {OUT} and {APP_SEED}")
