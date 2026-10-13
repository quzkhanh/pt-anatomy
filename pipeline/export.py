"""Cut Z-Anatomy down to training muscles + main skeleton, decimate, export GLB.

Usage:
  blender -b --disable-autoexec Startup.blend --python-exit-code 1 --python export.py -- \
      --muscles muscles.txt --out body.glb [--muscle-tris 3000] [--bone-ratio 0.25] [--sides r]

--sides r exports only right-side + midline objects; the viewer mirrors them (Z-Anatomy .l meshes
are mirror copies of .r, see the symmetry report printed below).
"""
import argparse
import sys

import bpy
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument("--muscles", required=True)
parser.add_argument("--out", required=True)
parser.add_argument("--muscle-tris", type=int, default=3000)
parser.add_argument("--bone-ratio", type=float, default=0.25)
parser.add_argument("--sides", default="r", choices=["r", "both"])
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])

SKELETON = "1: Skeletal system"
MUSCLES = "4: Muscular system"
BONE_EXCLUDE = ("tooth", "Stapes", "Malleus", "Incus", "Sinus", "cartilage", "Vomer", "Ethmoid")

suffixes = (".r",) if args.sides == "r" else (".r", ".l")
muscle_names = {
    line.strip() for line in open(args.muscles) if line.strip() and not line.startswith("#")
}


def top_collection(obj):
    for coll in obj.users_collection:
        root = coll
        while True:
            parent = next((c for c in bpy.data.collections if root.name in c.children), None)
            if parent is None:
                return root.name
            root = parent
    return ""


def tri_count(mesh):
    return sum(len(p.vertices) - 2 for p in mesh.polygons)


def keep_role(obj):
    if obj.type != "MESH":
        return None
    root = top_collection(obj)
    base, dot, side = obj.name.rpartition(".")
    if root.startswith(MUSCLES) and base in muscle_names and dot + side in suffixes:
        return "muscle"
    if root.startswith(SKELETON) and not obj.hide_get() and len(obj.data.polygons):
        is_midline = obj.name[-2:-1] != "."
        if (is_midline or obj.name.endswith(suffixes)) and not any(x in obj.name for x in BONE_EXCLUDE):
            return "bone"
    return None


def fail(message):
    print("ERROR", message)
    sys.exit(1)


def world_bounds(obj):
    points = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return [min(p[i] for p in points) for i in range(3)], [max(p[i] for p in points) for i in range(3)]


# The viewer mirrors .r meshes across x=0 to get the left side.
def check_mirror_symmetry(names=("Femur", "Humerus", "Scapula", "Latissimus dorsi muscle")):
    for name in names:
        (rlo, rhi), (llo, lhi) = world_bounds(bpy.data.objects[name + ".r"]), world_bounds(bpy.data.objects[name + ".l"])
        if abs(rlo[0] + lhi[0]) > 1e-3 or abs(rhi[2] - lhi[2]) > 1e-3:
            fail(f"{name}: .l is not a mirror of .r across x=0")


# Z-Anatomy ships these pairs with names swapped: its "Descending part of trapezius" sits at
# T1-T12 (z 1.12-1.41) and "Ascending part" on the neck (z 1.42-1.58), the reverse of anatomy.
# Each pair is (part that must be higher, part that must be lower).
SWAPPED_NAMES = [("Descending part of trapezius muscle", "Ascending part of trapezius muscle")]


def fix_swapped_names():
    for upper, lower in SWAPPED_NAMES:
        for side in (".r", ".l"):
            a, b = bpy.data.objects[upper + side], bpy.data.objects[lower + side]
            if world_bounds(a)[1][2] > world_bounds(b)[1][2]:
                fail(f"{upper}{side} is already above {lower}{side}; upstream fixed it, remove from SWAPPED_NAMES")
            a.name = "__swap__"
            b.name = upper + side
            a.name = lower + side


check_mirror_symmetry()
fix_swapped_names()

roles = {obj.name: keep_role(obj) for obj in bpy.data.objects}
found = {n.rpartition(".")[0] for n, r in roles.items() if r == "muscle"}
missing = sorted(muscle_names - found)
if missing:
    fail(f"muscles not found in model: {missing}")

for obj in bpy.data.objects:
    if roles[obj.name] and obj.parent:
        world = obj.matrix_world.copy()
        obj.parent = None
        obj.matrix_world = world

for obj in [o for o in bpy.data.objects if not roles[o.name]]:
    bpy.data.objects.remove(obj, do_unlink=True)

depsgraph = bpy.context.evaluated_depsgraph_get()
stats = {"muscle": [0, 0], "bone": [0, 0]}
for obj in list(bpy.data.objects):
    role = roles[obj.name]
    src_tris = tri_count(bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph)))
    ratio = min(1.0, args.muscle_tris / src_tris) if role == "muscle" else args.bone_ratio
    if ratio < 1.0:
        mod = obj.modifiers.new("decimate", "DECIMATE")
        mod.ratio = ratio
        mod.use_collapse_triangulate = True
    depsgraph.update()
    obj.data = bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph))
    obj.modifiers.clear()
    obj.data.materials.clear()
    obj["role"] = role
    stats[role][0] += 1
    stats[role][1] += tri_count(obj.data)

for role, (count, tris) in stats.items():
    print(f"STAT {role}: {count} objects, {tris} tris")

bpy.ops.export_scene.gltf(
    filepath=args.out,
    export_format="GLB",
    export_materials="NONE",
    export_texcoords=False,
    export_apply=False,
    export_yup=True,
    export_extras=True,
)
print("EXPORTED", args.out)
