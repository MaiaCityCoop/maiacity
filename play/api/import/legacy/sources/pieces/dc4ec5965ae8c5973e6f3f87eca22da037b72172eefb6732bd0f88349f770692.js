				return pose;
			}
		},
		first: "sing",
		gears: { hop: .3 * k },
		feet: ["toesL", "toesR"]
	};
}

//#endregion
//#region src/lib/actors/casts.ts
const each = (kind, ids, make) => Object.fromEntries(ids.map((id) => [`${kind}-${id}`, () => make(id)]));
const CASTS = /* @__PURE__ */ (() => ({
	...each("chicken", CHICKEN_KINDS, chicken),
	...each("goose", GOOSE_BREEDS, goose),
	...each("goat", GOAT_BREEDS, goat),
	...each("sheep", SHEEP_BREEDS, sheep),
	...each("rabbit", RABBIT_COATS, rabbit),
	...each("frog", FROG_KINDS, frog),
	...each("fish", FISH_KINDS, fish),
	...each("bird", SONGBIRDS, songbird),
	bee,
	ant,
	"ant-hill": antHill
