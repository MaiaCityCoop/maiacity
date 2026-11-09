// The levelling worked out (the Game editor, Samuel 2026-11-04): from a levels/1 config (its schema a document, play/api/migrations/schemas/levels.json its v1)
// every level's new villagers and what they bring, the minds a mind costs and each villager gets, the investor's ticket
// and its minds and share, the minds minted, what the level costs, and the treasury after it: euros raised and left after
// building, hearts held, minds minted in all and how much of them investors own. Pure: the page and its test read it.
//
// The rules, as Samuel set them: every new villager brings `villager.euros` and `villager.hearts`; at each level an
// investor adds `investor` times the euros the level's new villagers brought. A mind costs `heartsPerMind` hearts at
// level 1 and `step` more at every level after (10, 20, 30 …: the milestone ladder), or that in euros at
// `heartsPerEuro` hearts a euro; a villager's hearts and euros both buy minds at that price, an investor's euros too.
// So the earliest villagers and investors get the most minds for what they bring.

export type Unlock = { label: string; cost: number; kind?: string; note?: string };
export type Level = { id: string; villagers: number; phase: string; investor: number; unlocks: Unlock[]; note?: string };
export type Levelling = {
	schema: 'levels/1';
	label: string;
	note?: string;
	villager: { euros: number; hearts: number };
	minds: { heartsPerMind: number; step: number; heartsPerEuro: number };
	levels: Level[];
};

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
	investor: { euros: number; minds: number; share: number };
	minted: number;
	cost: number;
	treasury: {
		/** euros raised so far, villagers' and investors' */
		raised: number;
		/** of which villagers brought, and investors */
		euros: { villagers: number; investors: number };
		/** euros spent on what the levels so far unlocked */
		spent: number;
		/** raised less spent */
		left: number;
		hearts: number;
		minds: number;
		/** the share of all minds minted so far that investors hold */
		investors: number;
		/** all minds at this level's price, in euros */
		value: number;
	};
};

export function ledger(c: Levelling): Row[] {
	const rows: Row[] = [];
	let before = 0, villagerEuros = 0, investorEuros = 0, spent = 0, hearts = 0, minds = 0, investorMinds = 0;
	c.levels.forEach((level, i) => {
		const joined = Math.max(0, level.villagers - before);
		before = level.villagers;
		const ph = c.minds.heartsPerMind + c.minds.step * i;
		const pe = ph / c.minds.heartsPerEuro;
		const each = { euros: c.villager.euros, hearts: c.villager.hearts, minds: c.villager.hearts / ph + c.villager.euros / pe };
		const all = { euros: joined * each.euros, hearts: joined * each.hearts, minds: joined * each.minds };
		const inv = all.euros * level.investor;
		const invMinds = inv / pe;
		const minted = all.minds + invMinds;
		const cost = level.unlocks.reduce((t, u) => t + u.cost, 0);
		villagerEuros += all.euros;
		investorEuros += inv;
		const raised = villagerEuros + investorEuros;
		spent += cost;
		hearts += all.hearts;
		minds += minted;
		investorMinds += invMinds;
		rows.push({
			level,
			n: i + 1,
			joined,
			price: { hearts: ph, euros: pe },
			villager: each,
			villagers: all,
			investor: { euros: inv, minds: invMinds, share: minted ? invMinds / minted : 0 },
			minted,
			cost,
			treasury: { raised, euros: { villagers: villagerEuros, investors: investorEuros }, spent, left: raised - spent, hearts, minds, investors: minds ? investorMinds / minds : 0, value: minds * pe },
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
