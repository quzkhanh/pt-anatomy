"""Dump every mesh object in the open .blend: name, collection path, triangle count, visibility.

Usage: blender -b --disable-autoexec <file.blend> --python-exit-code 1 --python inspect.py -- <out.json>
"""
import json
import sys

import bpy

out_path = sys.argv[sys.argv.index("--") + 1]


def collection_path(obj):
    for coll in bpy.data.collections:
        if obj.name in coll.objects:
            path = [coll.name]
            parent = next((c for c in bpy.data.collections if coll.name in c.children), None)
            while parent:
                path.insert(0, parent.name)
                parent = next((c for c in bpy.data.collections if parent.name in c.children), None)
            return "/".join(path)
    return ""


rows = []
for obj in bpy.data.objects:
    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons) if obj.type == "MESH" else 0
    rows.append({
        "name": obj.name,
        "type": obj.type,
        "collection": collection_path(obj),
        "tris": tris,
        "hidden": obj.hide_get() if obj.name in bpy.context.view_layer.objects else None,
        "modifiers": [m.type for m in obj.modifiers],
        "parent": obj.parent.name if obj.parent else None,
    })

with open(out_path, "w") as f:
    json.dump(rows, f, ensure_ascii=False, indent=1)
print(f"wrote {len(rows)} objects to {out_path}")
