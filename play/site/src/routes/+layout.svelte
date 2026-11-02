<script lang="ts">
	import '../lib/fonts/fraunces/opsz.css';
	import '../lib/fonts/dm-sans/opsz.css';
	import '../app.css';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { loadMe, session, signOut } from '$lib/session.svelte';
	import { may } from '$lib/api';
	import SignIn from '$lib/SignIn.svelte';

	let { children } = $props();
	onMount(loadMe);

	const nav = [
		{ href: '/sandbox-1/', label: 'Sandbox 1' },
		{ href: '/sandbox-2/', label: 'Sandbox 2' },
		{ href: '/sandbox-3/', label: 'Sandbox 3' },
		{ href: '/assets/', label: 'Assets' },
		{ href: '/proposals/', label: 'Proposals' },
		{ href: '/game/', label: 'Game' }
	];
	const here = (href: string) => page.url.pathname.startsWith(href);
</script>

<header class="head">
	<a class="brand" href="/">maia<b>CITY</b> <span>play</span></a>
	{#if session.me}
		<nav>
			{#each nav as n}<a href={n.href} class:here={here(n.href)}>{n.label}</a>{/each}
			{#if may(session.me, 'manage', 'members')}<a href="/admin/" class:here={here('/admin/')}>Admin</a>{/if}
		</nav>
		<div class="who">
			<span class="pill {session.me.level}">{session.me.level}</span>
			<span class="name">{session.me.name}</span>
			<button class="btn ghost small" onclick={signOut}>Sign out</button>
		</div>
	{/if}
</header>

{#if !session.ready}
	<main class="page"><p class="muted">Loading…</p></main>
{:else if !session.me}
	<SignIn />
{:else}
	{@render children()}
{/if}

<style>
	.head {
		position: fixed; inset: 0 0 auto; z-index: 50; height: var(--head);
		display: flex; align-items: center; gap: 1.25rem; padding: 0 1rem;
		background: rgb(250 248 242 / 0.92); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line);
	}
	.brand { font-family: var(--font-display); font-size: 1.35rem; color: var(--ink); text-decoration: none; white-space: nowrap; }
	.brand b { font-weight: 700; }
	.brand span { font-family: var(--font-body); font-size: 0.8rem; font-weight: 600; color: var(--paper); background: var(--terracotta); border-radius: 999px; padding: 0.15em 0.55em; vertical-align: middle; }
	nav { display: flex; gap: 0.25rem; overflow-x: auto; flex: 1; scrollbar-width: none; }
	nav a { color: var(--ink-soft); text-decoration: none; font-weight: 500; padding: 0.4em 0.75em; border-radius: 999px; white-space: nowrap; }
	nav a:hover { background: var(--cream); }
	nav a.here { background: var(--ink); color: var(--paper); }
	.who { display: flex; align-items: center; gap: 0.5rem; white-space: nowrap; }
	@media (max-width: 760px) { .name { display: none; } .head { gap: 0.6rem; } }
</style>
