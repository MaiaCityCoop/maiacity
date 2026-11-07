# a4f8dc85 · Your own character: handover

Intent `a4f8dc85-5cef-43d8-acfa-ae568d21ad18`, branch `intent/a4f8dc85-own-character`, draft PR #2157. The
Orchestrator is `session_01E9zxn7GDnh279pBdf45mCQ`: send it every question, decision and blocker (claude-code-remote
`send_message`). Never merge, accept, approve or archive.

**Privacy:** the repository is public. Samuel's photos, his brief and his sheet live only in his **personal library** on
play and in the session's scratchpad. They are named here by hash only. Never commit them, never put them in the coop's
Library.

## Done

- **tools/sheet** (commit 3ffa2f6):
  - `--kind character` and `--ref <photo>` (repeatable): with references the plate goes to `fal-ai/nano-banana-pro/edit`.
  - `--library coop|personal`: a character is personal only; anything made from photos must name its library.
  - `sheet-edit.ts --ref`, `--dry-run`, and the shared helpers in `tools/sheet/fal.ts`.
  - Tested: every guard refuses as it should, the dry run builds the request, and a personal upload works (not seen in
    the coop's Library).
- **In Samuel's personal library** (fetch each with `GET https://play.maia.city/api/files/<hash>`, sending
  `Authorization: Bearer $PLAY_MCP_TOKEN`, to play only):

| # | what | hash |
|---|---|---|
| brief | the plate's brief (Markdown): his look, the clothes, the layout | `6faa1e8b106c9f076c7553e1f2d1211c158f56e0921e78068974c4096ce74b68` |
| image 1 | face front, smiling (cropped): **truth for the face** | `6aa9786804f987949b864f1dcd540ad83d1737e5a814d530576c805bbd57178e` |
| image 2 | face three-quarter, smiling, cap (cropped): **truth for the face** | `bf7e4a5f32d7b249b8b793cefa44dc127106bad1fc9964b152a87a8f254835c3` |
| image 3 | full body, bald (street): build and skull | `d8a21472b5e14317eb15bfd80721c082aeaaed5407e6054c368aec665aa75a38` |
| image 4 | dome, cream linen (generated): clothes only | `ff1aa13a52c884701e05704b987c7e2962122383e87fb125b41c45a3998af600` |
| image 5 | arch, cream linen from behind (generated): clothes only | `4f0068f7a532ebd17fd064d6b662682c6f2a187dadd4f9bc9f4e295019f7834d` |

The crops are the originals (`073ca2f1…`, `99187454…`, `93122637…`, `d31f091a…`, `3600d494…`) without their screenshot
chrome. The image numbers are the order the brief refers to: keep the `--ref` order.

## The command

```sh
S=<your scratchpad>/a4f8dc85; mkdir -p $S
H="Authorization: Bearer $PLAY_MCP_TOKEN"; F=https://play.maia.city/api/files
curl -sS -H "$H" -o $S/brief.md $F/6faa1e8b106c9f076c7553e1f2d1211c158f56e0921e78068974c4096ce74b68
i=1; for h in 6aa9786804f987949b864f1dcd540ad83d1737e5a814d530576c805bbd57178e \
  bf7e4a5f32d7b249b8b793cefa44dc127106bad1fc9964b152a87a8f254835c3 \
  d8a21472b5e14317eb15bfd80721c082aeaaed5407e6054c368aec665aa75a38 \
  ff1aa13a52c884701e05704b987c7e2962122383e87fb125b41c45a3998af600 \
  4f0068f7a532ebd17fd064d6b662682c6f2a187dadd4f9bc9f4e295019f7834d; do
  curl -sS -H "$H" -o $S/ref-$i.jpg $F/$h; i=$((i+1)); done
bun tools/sheet/sheet.ts --kind character --library personal --brief $S/brief.md --out $S/sheet \
  --ref $S/ref-1.jpg --ref $S/ref-2.jpg --ref $S/ref-3.jpg --ref $S/ref-4.jpg --ref $S/ref-5.jpg \
  --label "Samuel · character sheet" [--n 2]
```

Add `--dry-run` first to see `prompt.txt` and `request.json`. The plate's hash is printed and written to
`$S/sheet/sheet-1.hash`.

## Next

1. **Make the plate** (the command above).
2. **Check it critically against images 1 and 2, face first:**
   - the face: skull, brow, eyes (light blue-grey), nose, cheeks, the lopsided smile;
   - completely bald;
   - the full trimmed reddish-brown beard;
   - every cell the same man;
   - the 169 cm line at the crown;
   - the linen band collar with its half placket.
3. **Redraw the cells that drift**, the real photos going with the sheet:

   ```sh
   bun tools/sheet/sheet-edit.ts --sheet $S/sheet/sheet-1.jpg --fix $S/fix.txt --out $S/sheet/sheet-2 \
     --ref $S/ref-1.jpg --ref $S/ref-2.jpg --kind character --library personal \
     --label "Samuel · character sheet · 2 (cells redrawn)"
   ```

   `fix.txt`: "Image 1 is the sheet; images 2 and 3 are real photos of this man. Keep the whole plate exactly as it is …
   Redraw ONLY these cells: …", then one paragraph per cell.
4. **Send the final plate's hash to the Orchestrator** for Samuel's go (c2).
5. **The 3D (c1, c3–c6)** waits for 99b612ec's body. The face-method research (MakeHuman landmark fit vs FLAME-style
   fit vs image-to-3D on fal) was started in the old session; its sources are kept as Artifacts (`list_artifacts`), and
   its report goes to the Orchestrator.
6. **When the 3D part is done:** the actor skill's "Your own character" part (c6), then mark PR #2157 ready.
