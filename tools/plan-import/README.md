# plan-import

Python tools that turn a surveyor's general plan (vector PDF from CAD) and a stand spreadsheet into stand polygons,
sizes and boundary types (road / neighbour / open space). The platform will run this as a Docker service when an
admin uploads plans. See docs/ROADMAP.md.

- `plan_processing.py`  core: read labels, trace parcels, calibrate scale, classify boundaries
- `prepare_estate.py`   one-off script used for the first estate (reads files from a `source/` folder)
- `render_cycles.py`    optional: photo-style renders of an exported .glb scene with Blender Cycles

Requirements: `pip install pdfplumber pypdfium2 opencv-python-headless numpy openpyxl` (and `bpy` for renders).
