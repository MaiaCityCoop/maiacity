/**
 * No paid generation without a person's OK (intent eb7024df): every image sheet.ts and sheet-edit.ts asks of fal costs
 * money, so a run calls fal only with `--allow <n>`, n the images the operator allowed this run (avenMAIA's system
 * prompt: ask first, saying what for and how many; never retry or iterate without asking again).
 *
 * `allow(images)` is called before anything is sent, with the images the run is about to ask for:
 * - without `--allow <n>`, or when the run would ask for more than n, it exits non-zero before any network call;
 * - it then holds fetch to it: every request to fal's queue counts the images it asks for (`num_images`, else 1),
 *   and one past the allowance is refused before it is sent;
 * - as the run ends it prints the calls made and their images, whatever happened (to stderr);
 * - `--dry-run` needs no allowance: nothing is sent to fal, the request is printed instead.
 */
const FAL = /^https:\/\/queue\.fal\.run\/(.+)$/;

export function allow(images: number, argv = process.argv): void {
  const dry = argv.includes("--dry-run");
  const i = argv.indexOf("--allow");
  const given = i > 0 ? argv[i + 1] : undefined;
  const n = given !== undefined && /^\d+$/.test(given) ? Number(given) : NaN;
  // a dry run sends nothing, so it needs no key either
  if (dry && !process.env.FAL_API_KEY && !process.env.FAL_KEY) process.env.FAL_KEY = "dry-run";
  if (!dry) {
    if (!Number.isInteger(n) || n < 1) {
      refuse(`calls fal only with --allow <n>, n the paid images the operator allowed for this run (asked for: ${images}). Ask first, say what for and how many; or --dry-run.`);
    }
    if (images > n) refuse(`this run would ask fal for ${images} images, --allow is ${n}. Ask the operator again for more.`);
  }

  let calls = 0, made = 0;
  const real = globalThis.fetch;
  const guarded = async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input?.url;
    const model = FAL.exec(String(url));
    // a submission is a POST to the model's path; polling its status and fetching its result are GETs
    if (model && String(init?.method ?? input?.method ?? "GET").toUpperCase() === "POST" && !model[1].includes("/requests/")) {
      let body: any = {};
      try { body = JSON.parse(String(init?.body ?? "{}")); } catch {}
      const asked = Number(body.num_images ?? 1);
      if (dry) {
        console.error(`dry run: would call ${model[1]} for ${asked} image${asked === 1 ? "" : "s"}; nothing sent.`);
        process.exit(0);
      }
      if (made + asked > n) refuse(`a call to ${model[1]} for ${asked} would bring this run to ${made + asked} images, --allow is ${n}: not sent. Ask the operator again.`);
      calls++;
      made += asked;
    }
    return real(input, init);
  };
  globalThis.fetch = Object.assign(guarded, real) as typeof fetch;
  if (!dry) {
    process.on("exit", () => console.error(`fal: ${calls} call${calls === 1 ? "" : "s"} made, ${made} image${made === 1 ? "" : "s"} asked (--allow ${n}).`));
  }
}

function refuse(why: string): never {
  console.error(`Refused: ${why}`);
  process.exit(2);
}
