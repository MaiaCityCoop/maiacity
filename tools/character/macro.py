"""MakeHuman's macro targets as MakeHuman weighs them: gender, age (years), muscle, weight, ethnicity (caucasian)."""
import os, numpy as np
from mhbasis import D, load_target
def macro_offsets(n, gender=1.0, years=37, muscle=0.75, weight=0.5, caucasian=1.0):
    a = 0.5 + (years - 25) / 65 * 0.5 if years >= 25 else 0.1875 + (years - 1) / 24 * 0.3125
    ages = {"young": 1 - (a - 0.5) / 0.5, "old": (a - 0.5) / 0.5} if a >= 0.5 else {"child": 1 - (a - 0.1875) / 0.3125, "young": (a - 0.1875) / 0.3125}
    gw = {"male": gender, "female": 1 - gender}
    mw = {"averagemuscle": 1 - (muscle - 0.5) / 0.5, "maxmuscle": (muscle - 0.5) / 0.5} if muscle >= 0.5 else {"minmuscle": 1 - muscle / 0.5, "averagemuscle": muscle / 0.5}
    ww = {"averageweight": 1 - (weight - 0.5) / 0.5, "maxweight": (weight - 0.5) / 0.5} if weight >= 0.5 else {"minweight": 1 - weight / 0.5, "averageweight": weight / 0.5}
    d = np.zeros((n, 3)); M = os.path.join(D, "targets", "macrodetails")
    for g, x in gw.items():
        for ag, y in ages.items():
            if x * y == 0: continue
            d += x * y * caucasian * load_target(os.path.join(M, f"caucasian-{g}-{ag}.target"), n)
            for m, z in mw.items():
                for w, u in ww.items():
                    if x * y * z * u: d += x * y * z * u * load_target(os.path.join(M, f"universal-{g}-{ag}-{m}-{w}.target"), n)
    return d
