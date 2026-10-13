"""Relative-position rules for muscles that are easy to mislabel, checked on right-side (.r) objects.

Z-Anatomy axes: +Z is up, the body faces -Y (smaller y = more anterior), |x| grows laterally.
A failing rule means either the data or the rule is wrong: render both objects and look before
editing a rule.
"""
import math

from mathutils import Vector

ABOVE = "above"
ANTERIOR = "anterior to"
LATERAL = "lateral to"
# Layered trunk sheets: around a vertical axis at the midline, cut both muscles into cells
# (height x angle) and require `a` to be the outer surface in most cells they share.
# Measured on Z-Anatomy 2026-10-14: external/internal oblique 0.94, internal oblique/transversus 0.95.
OUTSIDE = "outside"
OUTSIDE_CELL_M = 0.02
OUTSIDE_SECTORS = 36
OUTSIDE_MIN_SHARE = 0.85

RULES = [
    ("Descending part of trapezius muscle", ABOVE, "Transverse part of trapezius muscle"),
    ("Transverse part of trapezius muscle", ABOVE, "Ascending part of trapezius muscle"),
    ("Rhomboid minor muscle", ABOVE, "Rhomboid major muscle"),
    ("Teres minor muscle", ABOVE, "Teres major muscle"),
    ("Supraspinatus muscle", ABOVE, "Infraspinatus muscle"),
    ("Clavicular part of deltoid muscle", ANTERIOR, "Acromial part of deltoid muscle"),
    ("Acromial part of deltoid muscle", ANTERIOR, "Scapular spinal part of deltoid muscle"),
    ("Clavicular head of pectoralis major muscle", ABOVE, "Sternocostal head of pectoralis major muscle"),
    ("Sternocostal head of pectoralis major muscle", ANTERIOR, "Pectoralis minor muscle"),
    ("Rectus abdominis muscle", ANTERIOR, "Multifidus lumborum muscle"),
    ("External abdominal oblique muscle", LATERAL, "Rectus abdominis muscle"),
    ("External abdominal oblique muscle", OUTSIDE, "Internal abdominal oblique muscle"),
    ("Internal abdominal oblique muscle", OUTSIDE, "Transversus abdominis muscle"),
    ("Long head of biceps brachii", LATERAL, "Short head of biceps brachii"),
    ("Lateral head of triceps brachii", LATERAL, "Medial head of triceps brachii"),
    ("Gluteus medius muscle", ABOVE, "Gluteus maximus muscle"),
    ("Psoas major", ABOVE, "Iliacus muscle"),
    ("Vastus lateralis muscle", LATERAL, "Vastus medialis muscle"),
    ("Rectus femoris muscle", ANTERIOR, "Vastus intermedius muscle"),
    ("Long head of biceps femoris", LATERAL, "Semitendinosus muscle"),
    # Gastrocnemius is superficial (posterior) to soleus.
    ("Soleus muscle", ANTERIOR, "Medial head of gastrocnemius"),
    ("Lateral head of gastrocnemius", LATERAL, "Medial head of gastrocnemius"),
    ("Tibialis anterior muscle", ANTERIOR, "Soleus muscle"),
    ("Fibularis longus muscle", LATERAL, "Tibialis anterior muscle"),
]


def center(obj):
    corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    return sum(corners, Vector()) / len(corners)


def world_vertices(obj):
    return [obj.matrix_world @ v.co for v in obj.data.vertices]


def outer_radius_by_cell(vertices, axis_y):
    cells = {}
    for v in vertices:
        angle = math.atan2(v.x, v.y - axis_y) + math.pi
        key = (int(v.z // OUTSIDE_CELL_M), int(angle / (2 * math.pi) * OUTSIDE_SECTORS))
        cells[key] = max(cells.get(key, 0.0), math.hypot(v.x, v.y - axis_y))
    return cells


def is_outside(a, b):
    va, vb = world_vertices(a), world_vertices(b)
    ys = [v.y for v in va + vb]
    axis_y = (min(ys) + max(ys)) / 2
    ca, cb = outer_radius_by_cell(va, axis_y), outer_radius_by_cell(vb, axis_y)
    shared = [k for k in ca if k in cb]
    return bool(shared) and sum(ca[k] > cb[k] for k in shared) / len(shared) >= OUTSIDE_MIN_SHARE


def holds(relation, a, b):
    if relation == OUTSIDE:
        return is_outside(a, b)
    ca, cb = center(a), center(b)
    if relation == ABOVE:
        return ca.z > cb.z
    if relation == ANTERIOR:
        return ca.y < cb.y
    return abs(ca.x) > abs(cb.x)


def check(objects):
    errors = []
    for a, relation, b in RULES:
        oa, ob = objects.get(a + ".r"), objects.get(b + ".r")
        if oa is None or ob is None:
            errors.append(f"rule references a missing object: {a!r} / {b!r}")
        elif not holds(relation, oa, ob):
            errors.append(f"{a} is not {relation} {b}")
    return errors
