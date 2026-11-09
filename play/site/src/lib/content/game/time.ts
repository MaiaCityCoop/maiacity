const DAY_MS = 86_400_000
const MONTHS_A_YEAR = 12
const EPOCH = Date.parse('2026-09-03T00:00:00Z')
/** Game time runs this many times faster than real time: a real day is a game month of thirty days. */
export const SPEED = 30

/** Real days since the founding, fractional. */
function daysSinceEpoch(now = new Date()): number {
	return (now.getTime() - EPOCH) / DAY_MS
}

/** The game calendar for a moment: year and month from 1, plus the game day within the month. */
export function calendar(now = new Date()): { year: number; month: number; day: number; dayIndex: number } {
	const d = Math.max(0, daysSinceEpoch(now))
	const dayIndex = Math.floor(d)
	const year = Math.floor(dayIndex / MONTHS_A_YEAR) + 1
	const month = (dayIndex % MONTHS_A_YEAR) + 1
	/* A game month has 30 days, so a real hour is a game day and a quarter. */
	const day = Math.floor((d - dayIndex) * 30) + 1
	return { year, month, day, dayIndex }
}

/**
 * The in-game clock, as a date. Game time starts at the founding
 * (03.09.2026 00:00) and runs thirty times faster than real time, so the
 * label is a real-looking date-time that counts up from that day.
 */
export function gameClock(now = new Date()): { date: Date; label: string } {
	const elapsed = Math.max(0, now.getTime() - EPOCH) * SPEED
	const date = new Date(EPOCH + elapsed)
	const pad = (n: number) => String(n).padStart(2, '0')
	const label = `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${pad(date.getUTCFullYear() % 100)} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
	return { date, label }
}

/** The hour of the in-game day, 0..24 with minutes as a fraction: what the sun follows. */
export function gameHour(now = new Date()): number {
	const d = gameClock(now).date
	return d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600
}
