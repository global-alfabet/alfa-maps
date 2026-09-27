"""
One-off data preparation: turns a development's general plan + schedule + available-stands sheet into
seed/estate.json for the 3D site. (This is the step a future "site generator" app will automate.)

  pip install pdfplumber pypdfium2 opencv-python-headless numpy openpyxl
  Put plan.pdf, schedule.pdf and available_stands.xlsx in tools/plan-import/source/, then:
  python tools/plan-import/prepare_estate.py
"""
from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path

import cv2
import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from plan_processing import (PlanRaster, page_labels, poly_area, read_stand_sheet,  # noqa: E402
                             render_page, _is_strip, _point_in_poly)

SRC = HERE / "source"
OUT = HERE.parent / "seed" / "estate.json"


def schedule_areas(pdf: Path) -> dict[str, float]:
    res: dict[str, float] = {}
    for _, _, _, labs in page_labels(pdf):
        st = [l for l in labs if re.fullmatch(r"\d{5}", l.text)]
        ar = [l for l in labs if re.fullmatch(r"\d[\d,]*(Ha)?", l.text) and not re.fullmatch(r"\d{5}", l.text)]
        for s in st:
            c = [a for a in ar if abs(a.y - s.y) < 1.2 and 5 < a.x - s.x < 45]
            if c:
                t = min(c, key=lambda a: a.x - s.x).text
                v = float(t.replace("Ha", "").replace(",", ".")) * 10000 if "Ha" in t else float(t.replace(",", ""))
                res.setdefault(s.text, v)
    return res


def main():
    plan_pdf = SRC / "plan.pdf"
    sheet = {r["no"]: r for r in read_stand_sheet(SRC / "available_stands.xlsx")}
    sched = schedule_areas(SRC / "schedule.pdf")
    sched.update({k: v for k, v in schedule_areas(plan_pdf).items() if k not in sched})
    for no, r in sheet.items():
        sched[no] = r["size"]
    print(f"available: {len(sheet)}  schedule sizes: {len(sched)}")

    _, _, _, labels = page_labels(plan_pdf)[0]
    gray, scale = render_page(plan_pdf, 0)
    R = PlanRaster(gray, scale)
    road_comp = int(np.argmax(R.area))

    # every numeric label on the plan → the region that contains it
    num_labels = [l for l in labels if re.fullmatch(r"\d{5}", l.text)]
    # join labels split into two runs ("345" + "66")
    for a, b in zip(labels, labels[1:]):
        j = a.text + b.text
        if re.fullmatch(r"\d{5}", j) and re.fullmatch(r"\d{2,3}", a.text) and math.dist((a.x, a.y), (b.x, b.y)) < 6 * max(a.size, 1):
            num_labels.append(type(a)(j, (a.x + b.x) / 2, (a.y + b.y) / 2, a.size))

    comp_of: dict[str, list[int]] = {}
    for lb in num_labels:
        c = R.region_at_label(lb)
        if c and c != road_comp:
            comp_of.setdefault(lb.text, []).append(c)

    # scale from stands with known sizes
    ratios = []
    for no, cs in comp_of.items():
        if no in sheet:
            ratios += [R.area[c] / sheet[no]["size"] for c in cs]
    med = float(np.median(ratios))
    good = [r for r in ratios if abs(r / med - 1) < .1]
    med = float(np.median(good))
    px_per_m = math.sqrt(med)
    typical = float(np.median([sheet[n]["size"] for n in sheet])) * med

    # choose one region per stand number (closest to its schedule size); record label for every region
    stand_comp: dict[str, int] = {}
    used: set[int] = set()
    for no, cs in comp_of.items():
        target = sched.get(no)
        best, err = None, 9e9
        for c in cs:
            e = abs(R.area[c] / (target * med) - 1) if target else 0.0
            if e < err:
                best, err = c, e
        if best is None or best in used:
            continue
        a = R.area[best]
        if not target and a > 3 * typical:
            continue
        if target and err > (.35 if target < 4000 else .5):
            continue
        if a > 4 * typical and _is_strip(R, best, px_per_m):
            continue
        stand_comp[no] = best
        used.add(best)

    # unlabelled stand-sized regions inside the estate footprint
    pts = np.array([[R.stats[c, 0] + R.stats[c, 2] / 2, R.stats[c, 1] + R.stats[c, 3] / 2] for c in used], dtype=np.float32)
    hull = cv2.convexHull(pts)
    extra = []
    for c in range(1, R.n):
        if c in used or c == road_comp:
            continue
        a = R.area[c]
        if not (0.25 * typical <= a <= 3 * typical):
            continue
        x, y, w, h = R.stats[c, :4]
        if a / float(w * h) < 0.35:
            continue
        if cv2.pointPolygonTest(hull, (float(x + w / 2), float(y + h / 2)), False) < 0:
            continue
        extra.append(c)
    # large regions that are not roads: parks, school/church sites, undeveloped land
    big = []
    for c in range(1, R.n):
        if c in used or c in extra or c == road_comp or R.area[c] <= 3 * typical:
            continue
        x, y, w, h = R.stats[c, :4]
        if cv2.pointPolygonTest(hull, (float(x + w / 2), float(y + h / 2)), False) < 0:
            continue
        H, W = R.lab.shape
        if x <= 2 or y <= 2 or x + w >= W - 2 or y + h >= H - 2 or R.area[c] > 120 * typical:
            continue
        if _is_strip(R, c, px_per_m):
            continue
        big.append(c)
    print(f"numbered regions: {len(stand_comp)}  unnumbered regions: {len(extra)}  large open regions: {len(big)}")

    all_c = list(stand_comp.values()) + extra + big
    xs = np.concatenate([[R.stats[c, 0], R.stats[c, 0] + R.stats[c, 2]] for c in all_c])
    ys = np.concatenate([[R.stats[c, 1], R.stats[c, 1] + R.stats[c, 3]] for c in all_c])
    ox, oy = float(xs.mean()), float(ys.mean())
    polys = {c: R.region_polygon(c, px_per_m) for c in all_c}
    r2 = np.array([poly_area(polys[c]) / sheet[n]["size"] for n, c in stand_comp.items() if n in sheet])
    m2 = float(np.median(r2)); m2 = float(np.median(r2[np.abs(r2 / m2 - 1) < .1]))
    px_per_m = math.sqrt(m2)

    def to_m(p):
        return [[round((x - ox) / px_per_m, 2), round((y - oy) / px_per_m, 2)] for x, y in p]

    comp_no = {c: n for n, c in stand_comp.items()}
    ink = R.gray <= 200

    def classify(x, y, dx, dy, own):
        H, W = R.lab.shape
        step = .25 * px_per_m
        d, comp, start = 0.0, 0, None
        while d < 45 * px_per_m:
            d += step
            px, py = int(x + dx * d), int(y + dy * d)
            if not (0 <= px < W and 0 <= py < H):
                return "open", "", 99.0
            c = int(R.lab[py, px])
            if start is None:
                if c and c != own and R.area[c] >= R.min_region:
                    comp, start = c, d
                continue
            if ink[py, px]:
                break
        if start is None:
            return "open", "", 99.0
        width = (d - start) / px_per_m
        if comp in comp_no:
            n = comp_no[comp]
            if sched.get(n, 0) > 4000:
                return "open", n, width
            return "neighbour", n, width
        if comp in extra:
            return "neighbour", "", width
        if R.area[comp] <= 3 * typical:
            return "neighbour", "", width
        if width <= 24:
            return "road", "", width
        return "open", "", width

    def edges_for(c, p):
        out = []
        n = len(p)
        for i in range(n):
            a, b = p[i], p[(i + 1) % n]
            L = float(np.hypot(*(b - a)))
            dx, dy = (b - a) / (L or 1)
            nx, ny = dy, -dx
            if _point_in_poly((a + b) / 2 + np.array([nx, ny]) * 2, p):
                nx, ny = -nx, -ny
            votes, widths = {}, []
            for t in (.2, .35, .5, .65, .8):
                q = a + (b - a) * t
                k = classify(q[0], q[1], nx, ny, c)
                votes[k[:2]] = votes.get(k[:2], 0) + 1
                if k[0] == "road" and k[2] > 5:
                    widths.append(k[2])
            kind, label = max(votes.items(), key=lambda kv: kv[1])[0]
            e = {"kind": kind, "length": round(L / px_per_m, 2)}
            if label:
                e["label"] = label
            if kind == "road" and widths:
                e["width"] = round(float(np.median(widths)))
            out.append(e)
        return out

    stands, opens = [], []
    for c in all_c:
        p = polys[c]
        if len(p) < 3:
            continue
        no = comp_no.get(c)
        area_m = poly_area(p) / px_per_m ** 2
        size = sched.get(no) if no else None
        rec = {"no": no or f"U{c}", "numbered": bool(no), "size": round(size or area_m), "measured": round(area_m, 1), "poly": to_m(p)}
        if c in big or (size and size > 4000):  # public open space / large parcels
            rec["kind"] = "open"
            opens.append(rec)
            continue
        rec["edges"] = edges_for(c, p)
        if no in sheet:
            rec["status"] = "available"
        else:
            rec["status"] = "sold"
        stands.append(rec)

    stands.sort(key=lambda s: (not s["numbered"], s["no"]))
    data = {
        "meta": {"source": plan_pdf.name, "px_per_m": px_per_m},
        "stands": stands,
        "open": opens,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, separators=(",", ":")))
    av = sum(1 for s in stands if s["status"] == "available")
    print(f"stands: {len(stands)} (available {av}, numbered {sum(1 for s in stands if s['numbered'])})  open spaces: {len(opens)}  -> {OUT}")
    # diagnostic overlay
    dbg = cv2.cvtColor(cv2.resize(R.gray, None, fx=.5, fy=.5), cv2.COLOR_GRAY2BGR)
    ov = dbg.copy()
    for s in stands + opens:
        pts2 = np.array([[(x * px_per_m + ox) * .5, (z * px_per_m + oy) * .5] for x, z in s["poly"]], np.int32)
        col = (80, 160, 255) if s.get("status") == "available" else (120, 200, 120) if s.get("kind") == "open" else (200, 180, 120) if s["numbered"] else (200, 120, 200)
        cv2.fillPoly(ov, [pts2], col)
    cv2.imwrite(str(HERE / "coverage.png"), cv2.addWeighted(ov, .55, dbg, .45, 0))


if __name__ == "__main__":
    main()
