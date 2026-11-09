// Sandbox 1 and Sandbox 5 are one dome-cell page (play/SPEC.md §5): what each serves before its world mounts (its
// head, its cover, its bar) is pinned here.
import { describe, expect, it } from 'vitest'
import { render } from 'svelte/server'
import One from '../sandbox-1/+page.svelte'
import Five from './+page.svelte'

describe('the dome-cell pages', () => {
	it('Sandbox 1 serves the same page', () => {
		const { head, body } = render(One)
		expect(head + body).toMatchSnapshot()
	})
	it('Sandbox 5 serves the same page', () => {
		const { head, body } = render(Five)
		expect(head + body).toMatchSnapshot()
	})
})
