# Propose order for 873c6ef2 (once 02e3a85f is live)

Pieces bottom-up, each v2 straight after its v1 on the same document, then the 14 hosts. Each piece is proposed once,
final (a proposed piece version can't be dropped). Hashes: out/plan.json. Documents: docs.json.

1. Layer 0 (requires only three.js): dqs v1 · carkit v1 · kitA (kit v1) · click1 (ClickLock v1), then click2 (v2) ·
   exc1 (excavator v1), then exc2 (v2) · aparts v1
2. Layer 1: parts v1 (needs kit v1) · veh1 (vehicle v1), then veh2 (v2) (kit v1) · rig v1 (dqs) · kitB (kit v2: kit v1 + its additions)
3. Layer 2: pc1 (Power Cube v1), then pc2 (v2) (kit v2, parts) · bp1 (battery pack v1: ClickLock v1, excavator v1),
   then bp2 (v2: ClickLock v2, excavator v2, rig, actors/parts)
4. Hosts: hatchback, sedan, suv, taxi, police, ambulance, van (car kit) · truck (kit v1, parts, vehicle v1) ·
   travelvan, fiat (kit v1, parts, vehicle v2) · pickup (kit v2, parts, Power Cube v2, vehicle v2) ·
   powercube (kit v2, parts, Power Cube v1) · batterycube (excavator v1, ClickLock v1, battery pack v1) ·
   batterypack (dqs, rig, excavator v2, actors/parts, ClickLock v2, battery pack v2)
5. Then the checks by hand with check_intent: c1–c8, the last must last.
