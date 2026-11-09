// Sandbox 1 and Sandbox 5 are one dome-cell page (play/SPEC.md §5): what Sandbox 5 serves before its world mounts (its
// head, its cover, its bar) is pinned here, Sandbox 1's beside its own page.
import { describe, expect, it } from 'vitest'
import { render } from 'svelte/server'
import Five from './+page.svelte'

/** a page as served, but for what moves on its own: the in-game clock, and the hydration marker of its head's owner */
const served = (page: any) => {
	const { head, body } = render(page)
	return (head + body).replace(/^<!--[a-z0-9]+-->/, '').replace(/<span class="day [^"]*">[^<]*<\/span> [0-9:]+/, 'CLOCK')
}

describe('the dome-cell pages', () => {
	it('Sandbox 5 serves the same page', () => {
		expect(served(Five)).toMatchSnapshot()
	})
})
