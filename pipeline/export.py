"""Cut Z-Anatomy down to the muscles listed in content/muscles.json, decimate, export GLB.
With --skeleton, export the bones listed in content/skeleton.json instead (bones.glb, loaded on demand).

Usage:
  blender -b --disable-autoexec Startup.blend --python-exit-code 1 --python export.py -- \
      --content content/muscles.json --out body.glb [--muscle-tris 3000]
  ... --python export.py -- --content content/muscles.json --skeleton content/skeleton.json --out bones.glb

Only right-side (.r) objects are exported; the viewer mirrors them across x=0 (Z-Anatomy .l meshes
are mirror copies of .r, checked by check_mirror_symmetry below).
"""
import argparse
import json
import os
import re
import sys

import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import anatomy_checks  # noqa: E402

parser = argparse.ArgumentParser()
parser.add_argument("--content", required=True)
parser.add_argument("--out", required=True)
parser.add_argument("--muscle-tris", type=int, default=3000)
parser.add_argument("--skeleton")
parser.add_argument("--bone-ratio", type=float, default=0.25)
# Small bones (phalanges, carpals) turn into blocks below this; the ratio alone would cut them to ~50 tris.
parser.add_argument("--bone-min-tris", type=int, default=400)
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])

MUSCLES = "4: Muscular system"
SKELETON = "1: Skeletal system"
SIDE = re.compile(r"\.([a-z])$")

muscle_names = {part["object"] for muscle in json.load(open(args.content)) for part in muscle["parts"]}
bone_names = {bone["object"] for bone in json.load(open(args.skeleton))} if args.skeleton else set()


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
    if args.skeleton:
        # Midline bones (vertebrae, sternum, sacrum) have no side suffix and exist once.
        side = SIDE.search(obj.name)
        base = obj.name[: side.start()] if side else obj.name
        if (not side or side[1] == "r") and base in bone_names and top_collection(obj) == SKELETON:
            return "bone"
        return None
    base, _, side = obj.name.rpartition(".")
    if side == "r" and base in muscle_names and top_collection(obj).startswith(MUSCLES):
        return "muscle"
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


HEAD_ROOT = "Regions of head.g"
HEAD_VOXEL_M = 0.006
HEAD_SHELL_M = 0.008
HEAD_SMOOTH_ITERATIONS = 12
HEAD_TRIS = 4000


def descendants(obj):
    for child in obj.children:
        yield child
        yield from descendants(child)


# Z-Anatomy has no single skin mesh, only skin patches per region. Fusing the head patches of both
# sides with a voxel remesh closes the gaps; heavy smoothing removes facial detail (mannequin look).
# The patches are zero-thickness sheets, so solidify gives them volume before remeshing, and normals
# are recalculated afterwards because the remesh output can be inside-out (culled by the viewer).
def build_head():
    depsgraph = bpy.context.evaluated_depsgraph_get()
    bm = bmesh.new()
    for obj in descendants(bpy.data.objects[HEAD_ROOT]):
        if obj.type != "MESH" or not obj.data.polygons:
            continue
        mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph))
        mesh.transform(obj.matrix_world)
        bm.from_mesh(mesh)
        bpy.data.meshes.remove(mesh)
    mesh = bpy.data.meshes.new("Head")
    bm.to_mesh(mesh)
    bm.free()
    head = bpy.data.objects.new("Head", mesh)
    bpy.context.scene.collection.objects.link(head)
    solidify = head.modifiers.new("solidify", "SOLIDIFY")
    solidify.thickness = HEAD_SHELL_M
    solidify.offset = 0.0
    remesh = head.modifiers.new("remesh", "REMESH")
    remesh.mode = "VOXEL"
    remesh.voxel_size = HEAD_VOXEL_M
    smooth = head.modifiers.new("smooth", "SMOOTH")
    smooth.factor = 1.0
    smooth.iterations = HEAD_SMOOTH_ITERATIONS
    baked = bpy.data.meshes.new_from_object(head.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    head.modifiers.clear()
    bm = bmesh.new()
    bm.from_mesh(baked)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(baked)
    bm.free()
    head.data = baked
    return head


# Without bones the 6 mm gap between left and right front-wall muscles (linea alba, sternum) looks
# straight through the trunk at the back muscles, so a highlighted erector spinae shows as a stripe
# down the belly. A thin neutral fin on the midline, kept between the inner surface of the front wall
# and the back muscles slice by slice, blocks that view without ever reaching the body surface.
FILLER_FRONT = ("Rectus abdominis muscle", "Sternocostal head of pectoralis major muscle")
FILLER_BACK = ("Longissimus thoracis muscle", "Spinalis thoracis muscle", "Multifidus lumborum muscle",
               "Iliocostalis lumborum muscle", "Splenius capitis muscle", "Descending part of trapezius muscle",
               "Transverse part of trapezius muscle", "Ascending part of trapezius muscle")
FILLER_OVERLAP_M = 0.004
FILLER_MAX_HALF_WIDTH_M = 0.02
FILLER_FRONT_REACH_M = 0.03
FILLER_BACK_REACH_M = 0.03
FILLER_SLICE_M = 0.01
FILLER_MARGIN_M = 0.002


def midline_vertices(names, reach):
    out = []
    for name in names:
        obj = bpy.data.objects[name + ".r"]
        out += [v for v in (obj.matrix_world @ p.co for p in obj.data.vertices) if abs(v.x) < reach]
    return out


def build_midline_filler():
    front = midline_vertices(FILLER_FRONT, FILLER_FRONT_REACH_M)
    back = midline_vertices(FILLER_BACK, FILLER_BACK_REACH_M)
    bm = bmesh.new()
    z = min(v.z for v in front)
    top = max(v.z for v in front)
    while z < top:
        f = [v for v in front if z <= v.z < z + FILLER_SLICE_M]
        b = [v.y for v in back if z <= v.z < z + FILLER_SLICE_M]
        if f and b and min(b) - max(v.y for v in f) > 2 * FILLER_MARGIN_M:
            # Body faces -Y: the front wall's inner surface is its largest y, the back muscles' front is their smallest.
            y0, y1 = max(v.y for v in f) + FILLER_MARGIN_M, min(b) - FILLER_MARGIN_M
            # As wide as this slice's gap plus some overlap; it sits behind the wall, so overlap never shows.
            half_width = min(FILLER_MAX_HALF_WIDTH_M, min(abs(v.x) for v in f) + FILLER_OVERLAP_M)
            box = bmesh.ops.create_cube(bm, size=1.0)["verts"]
            for v in box:
                v.co = Vector((v.co.x * 2 * half_width,
                               y0 if v.co.y < 0 else y1,
                               z if v.co.z < 0 else z + FILLER_SLICE_M))
        z += FILLER_SLICE_M
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new("Midline filler")
    bm.to_mesh(mesh)
    bm.free()
    filler = bpy.data.objects.new("Midline filler", mesh)
    bpy.context.scene.collection.objects.link(filler)
    return filler


check_mirror_symmetry()
fix_swapped_names()
anatomy_errors = anatomy_checks.check(bpy.data.objects)
if anatomy_errors:
    fail("anatomy rules failed:\n  " + "\n  ".join(anatomy_errors))

roles = {obj.name: keep_role(obj) for obj in bpy.data.objects}
if args.skeleton:
    found = {SIDE.sub("", n) for n, r in roles.items() if r == "bone"}
    missing = sorted(bone_names - found)
    if missing:
        fail(f"bones not found in model: {missing}")
else:
    found = {n.rpartition(".")[0] for n, r in roles.items() if r == "muscle"}
    missing = sorted(muscle_names - found)
    if missing:
        fail(f"muscles not found in model: {missing}")
    roles[build_head().name] = "head"
    roles[build_midline_filler().name] = "filler"

for obj in bpy.data.objects:
    if roles[obj.name] and obj.parent:
        world = obj.matrix_world.copy()
        obj.parent = None
        obj.matrix_world = world

for obj in [o for o in bpy.data.objects if not roles[o.name]]:
    bpy.data.objects.remove(obj, do_unlink=True)

TARGET_TRIS = {"muscle": args.muscle_tris, "head": HEAD_TRIS, "filler": HEAD_TRIS}


def keep_ratio(role, src_tris):
    if role == "bone":
        return min(1.0, max(args.bone_ratio, args.bone_min_tris / src_tris))
    return min(1.0, TARGET_TRIS[role] / src_tris)


depsgraph = bpy.context.evaluated_depsgraph_get()
stats = {role: [0, 0] for role in [*TARGET_TRIS, "bone"]}
for obj in list(bpy.data.objects):
    role = roles[obj.name]
    src_tris = tri_count(bpy.data.meshes.new_from_object(obj.evaluated_get(depsgraph)))
    ratio = keep_ratio(role, src_tris)
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
    if count:
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
