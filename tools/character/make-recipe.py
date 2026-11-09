"""A character's recipe from its template and its baked face: the template's `__FACE__` replaced by the look's shape and
colours (bake.py's look-<tag>.json), wrapped in short lines. The result holds a person's face: keep it out of git.
    python make-recipe.py <template.js> <look.json> <out.js>"""
import json, sys, textwrap
tpl, look, out = sys.argv[1:4]; L = json.load(open(look))
wrap = lambda s: "[\n" + ",\n".join(f"\t\t'{l}'" for l in textwrap.wrap(s, 112)) + "\n\t]"
face = "{\n\tshape: " + wrap(L["shape"]) + ",\n\tcolours: " + wrap(L["colours"]) + "\n}"
src = open(tpl).read(); assert src.count("__FACE__") == 1
open(out, "w").write(src.replace("__FACE__", face)); print(out)
