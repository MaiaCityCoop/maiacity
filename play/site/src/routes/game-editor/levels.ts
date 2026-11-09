// The levelling worked out (the Game editor, Samuel 2026-11-04): from a levels/1 config (its schema a document, play/api/migrations/schemas/levels.json its v1)
// every level's new villagers and what they bring, the minds a mind costs and each villager gets, the investor's ticket
// and its minds and share, the minds minted, what the level costs, and the treasury after it: euros raised and left after
// building, hearts held, minds minted in all and how much of them investors own. Pure: the page and its test read it.
//
// The rules, as Samuel set them: every new villager brings `villager.euros` and `villager.hearts`; at each level an
// investor adds `investor` times the euros the level's new villagers brought, at most `investor.maxPerVillager` euros a
// new villager (Samuel 2026-11-09: "match up to 125k − 12.5k€ per villager"). A mind costs `heartsPerMind` hearts at
// level 1 and `step` more at every level after (10, 20, 30 …: the milestone ladder), or that in euros at
// `heartsPerEuro` hearts a euro; a villager's hearts and euros both buy minds at that price, an investor's euros too,
// but the villagers always hold at least `minds.villagersMin` of all minds minted (51 %, Samuel 2026-11-09): the
// investors' minds are capped to keep it so, and they pay more for a mind than a villager. So the earliest villagers
// and investors get the most minds for what they bring.
//
// The treasury pays only the village's own (land, domes, the tower, infrastructure: an unlock's `owner` 'village', the
// default); what a coop puts into its own (its insides, an energy plant: `owner` 'coop', `coop` its name) is counted
// beside it, never taken from it (Samuel 2026-11-09). And an unlock may house people (`beds`): a level is housed while
// its beds cover its villagers, and ready while they cover the next level's, for a newcomer moves in only to a bed.

/** cost: what it costs the way the village builds it (self-built); contractor: what a contractor would charge, shown beside */
export type Unlock = { label: string; cost: number; contractor?: number; kind?: string; note?: string; owner?: 'village' | 'coop'; coop?: string; beds?: number };
export type Level = { id: string; villagers: number; phase: string; investor: number; unlocks: Unlock[]; note?: string };
export type Levelling = {
	schema: 'levels/1';
	label: string;
	note?: string;
	villager: { euros: number; hearts: number };
	minds: { heartsPerMind: number; step: number; heartsPerEuro: number; villagersMin?: number };
	investor?: { maxPerVillager?: number };
	levels: Level[];
};

/** the villagers' least share of the minds when the config names none */
export const VILLAGERS_MIN = 0.51;

export const isCoop = (u: Unlock) => u.owner === 'coop';

export type Row = {
	level: Level;
	/** 1, 2, 3 … */
	n: number;
	/** villagers who joined at this level */
	joined: number;
	/** what one mind costs at this level */
	price: { hearts: number; euros: number };
	/** each new villager: what they bring and the minds it buys; and all of this level's new villagers together */
	villager: { euros: number; hearts: number; minds: number };
	villagers: { euros: number; hearts: number; minds: number };
	investor: {
		euros: number;
		/** the multiple of the villagers' euros it brought: the level's, or less where the cap held it */
		multiple: number;
		capped: boolean;
		minds: number;
		/** its share of the minds minted at this level */
		share: number;
		/** what it paid for a mind, in euros, and that as a multiple of a villager's price (Infinity: no mind left) */
		paid: number;
		premium: number;
	};
	minted: number;
	/** what the level's unlocks cost the village; and what coops put into their own, beside it */
	cost: number;
	coops: number;
	/** the village's cost at contractors' prices (an unlock without one at its cost) */
	contractor: number;
	/** beds so far, and whether they house this level's villagers and the next level's */
	beds: number;
	housed: boolean;
	ready: boolean;
	treasury: {
		/** euros raised so far, villagers' and investors' */
		raised: number;
		/** of which villagers brought, and investors */
		euros: { villagers: number; investors: number };
		/** euros spent on the village's own unlocks so far */
		spent: number;
		/** raised less spent */
		left: number;
		/** what coops put into their own so far, never from the treasury */
		coops: number;
		/** spent so far had contractors built it, and raised less that */
		contractor: { spent: number; left: number };
		hearts: number;
		minds: number;
		/** the share of all minds minted so far that investors hold, and that villagers hold */
		investors: number;
		villagers: number;
		/** all minds at this level's price, in euros */
		value: number;
	};
};

export function ledger(c: Levelling): Row[] {
	const rows: Row[] = [];
	const least = c.minds.villagersMin ?? VILLAGERS_MIN;
	const most = c.investor?.maxPerVillager ?? Infinity;
	let before = 0, villagerEuros = 0, investorEuros = 0, spent = 0, byContractors = 0, coops = 0, hearts = 0, villagerMinds = 0, investorMinds = 0, beds = 0;
	c.levels.forEach((level, i) => {
		const joined = Math.max(0, level.villagers - before);
		before = level.villagers;
		const ph = c.minds.heartsPerMind + c.minds.step * i;
		const pe = ph / c.minds.heartsPerEuro;
		const each = { euros: c.villager.euros, hearts: c.villager.hearts, minds: c.villager.hearts / ph + c.villager.euros / pe };
		const all = { euros: joined * each.euros, hearts: joined * each.hearts, minds: joined * each.minds };
		const asked = all.euros * level.investor;
		const inv = Math.min(asked, joined * most);
		villagerMinds += all.minds;
		// the investors' minds so far may reach (1 − least) of all: v · (1 − least) / least
		const room = Math.max(0, (villagerMinds * (1 - least)) / least - investorMinds);
		const invMinds = Math.min(inv / pe, room);
		investorMinds += invMinds;
		const minted = all.minds + invMinds;
		const cost = level.unlocks.reduce((t, u) => t + (isCoop(u) ? 0 : u.cost), 0);
		const own = level.unlocks.reduce((t, u) => t + (isCoop(u) ? u.cost : 0), 0);
		const contractor = level.unlocks.reduce((t, u) => t + (isCoop(u) ? 0 : (u.contractor ?? u.cost)), 0);
		beds += level.unlocks.reduce((t, u) => t + (u.beds ?? 0), 0);
		const next = c.levels[i + 1]?.villagers ?? level.villagers;
		villagerEuros += all.euros;
		investorEuros += inv;
		const raised = villagerEuros + investorEuros;
		spent += cost;
		byContractors += contractor;
		coops += own;
		hearts += all.hearts;
		const minds = villagerMinds + investorMinds;
		const paid = invMinds ? inv / invMinds : inv ? Infinity : pe;
		rows.push({
			level,
			n: i + 1,
			joined,
			price: { hearts: ph, euros: pe },
			villager: each,
			villagers: all,
			investor: { euros: inv, multiple: all.euros ? inv / all.euros : 0, capped: inv < asked, minds: invMinds, share: minted ? invMinds / minted : 0, paid, premium: paid / pe },
			minted,
			cost,
			coops: own,
			contractor,
			beds,
			housed: beds >= level.villagers,
			ready: beds >= next,
			treasury: {
				raised,
				euros: { villagers: villagerEuros, investors: investorEuros },
				spent,
				left: raised - spent,
				coops,
				contractor: { spent: byContractors, left: raised - byContractors },
				hearts,
				minds,
				investors: minds ? investorMinds / minds : 0,
				villagers: minds ? villagerMinds / minds : 1,
				value: minds * pe,
			},
		});
	});
	return rows;
}

/** €12.5k, €1.6M, €157M */
export function euros(n: number): string {
	return `${n < 0 ? '−' : ''}€${short(Math.abs(n))}`;
}

/** 50k, 1.6M, 2.3B */
export function short(n: number): string {
	if (n >= 1e9) return `${trim(n / 1e9)}B`;
	if (n >= 1e6) return `${trim(n / 1e6)}M`;
	if (n >= 1e3) return `${trim(n / 1e3)}k`;
	return trim(n);
}
const trim = (n: number) => (n >= 100 ? Math.round(n).toString() : n >= 10 ? (Math.round(n * 10) / 10).toString() : (Math.round(n * 100) / 100).toString());

/** 1,234,567 */
export const whole = (n: number) => Math.round(n).toLocaleString('en-US');

/** 50 %, 7.5 % */
export const pct = (x: number) => `${x >= 0.1 ? Math.round(x * 100) : Math.round(x * 1000) / 10} %`;
