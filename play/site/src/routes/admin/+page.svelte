<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';

	type M = { id: string; name: string; founder_number: number | null; level: string; granted_at: string; granted_by: string | null };
	let members = $state<M[]>([]);
	let error = $state('');
	let invite = $state<{ code: string; expires: string } | null>(null);
	const load = async () => {
		try { members = await api<M[]>('/members'); } catch (e) { error = (e as Error).message; }
	};
	onMount(load);
	async function level(m: M, to: string) {
		try { await api(`/members/${m.id}/level`, { json: { level: to } }); error = ''; } catch (e) { error = (e as Error).message; }
		await load();
	}
	async function makeInvite() {
		try { invite = await api('/invites', { method: 'POST' }); } catch (e) { error = (e as Error).message; }
	}
	const link = $derived(invite ? `${location.origin}/game/?invite=${invite.code}` : '');
</script>

<svelte:head><title>Admin · maiaCITY play</title></svelte:head>

<main class="page">
	<h1>Maia City</h1>
	<p class="muted">The coop that owns every asset. Its admins are its owners; everyone who signs up is a traveler; an invite makes a citizen.</p>
	{#if error}<p class="error">{error}</p>{/if}
	<section class="card box">
		<h2>Invite a citizen</h2>
		<button class="btn mustard" onclick={makeInvite}>Make an invite link</button>
		{#if invite}<p><code>{link}</code><br /><span class="muted">Works once, until {new Date(invite.expires).toLocaleDateString()}.</span></p>{/if}
	</section>
	<section class="card box">
		<h2>Members ({members.length})</h2>
		<table>
			<thead><tr><th>Name</th><th>Founder</th><th>Level</th><th>Since</th></tr></thead>
			<tbody>
				{#each members as m (m.id)}
					<tr>
						<td>{m.name}</td>
						<td class="muted">{m.founder_number ? `#${m.founder_number}` : '—'}</td>
						<td><select value={m.level} onchange={(e) => level(m, (e.currentTarget as HTMLSelectElement).value)}><option>admin</option><option>citizen</option><option>traveler</option></select></td>
						<td class="muted">{new Date(m.granted_at).toLocaleDateString()}{m.granted_by ? ` · by ${m.granted_by}` : ''}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</section>
</main>

<style>
	.box { padding: 1.5rem; margin-top: 1.5rem; overflow-x: auto; }
	table { width: 100%; border-collapse: collapse; }
	th, td { text-align: left; padding: 0.55rem 0.4rem; border-bottom: 1px solid var(--line); }
	th { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
	select { padding: 0.35em 0.6em; }
</style>
