<script lang="ts">
	import { localDay } from '$lib/format';
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { session } from '$lib/session.svelte';

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
	// a member's name edited in place, and a member removed (the API keeps oneself, the last admin and the history's names)
	let editing = $state('');
	let draft = $state('');
	const edit = (m: M) => ((editing = m.id), (draft = m.name));
	async function rename(m: M) {
		try { await api(`/members/${m.id}/name`, { json: { name: draft } }); editing = ''; error = ''; } catch (e) { error = (e as Error).message; }
		await load();
	}
	async function remove(m: M) {
		if (!confirm(`Remove ${m.name || 'this member'} from Maia City? Their account and passkeys go with it.`)) return;
		try { await api(`/members/${m.id}`, { method: 'DELETE' }); error = ''; } catch (e) { error = (e as Error).message; }
		await load();
	}
	async function makeInvite() {
		try { invite = await api('/invites', { method: 'POST' }); } catch (e) { error = (e as Error).message; }
	}
	// sign-up is by invite only: the link opens play's sign-in page with the sign-up, and makes a traveler
	const link = $derived(invite ? `${location.origin}/?invite=${invite.code}` : '');
</script>

<svelte:head><title>Admin · maiaCITY play</title></svelte:head>

<main class="page">
	<h1>Maia City</h1>
	<p class="muted">The coop that owns every asset. Its admins are its owners; sign-up is by invite, and makes a traveler; an admin makes a citizen.</p>
	{#if error}<p class="error">{error}</p>{/if}
	<section class="card box">
		<h2>Invite a traveler</h2>
		<p class="muted">Maia City is invite-only: the link lets one person sign up, as a traveler. Make a citizen with their level below.</p>
		<button class="btn mustard" onclick={makeInvite}>Make an invite link</button>
		{#if invite}<p><code>{link}</code><br /><span class="muted">Works once, until {localDay(invite.expires)}.</span></p>{/if}
	</section>
	<section class="card box">
		<h2>Members ({members.length})</h2>
		<table>
			<thead><tr><th>Name</th><th>Founder</th><th>Level</th><th>Since</th><th></th></tr></thead>
			<tbody>
				{#each members as m (m.id)}
					<tr>
						<td>
							{#if editing === m.id}
								<form class="rename" onsubmit={(e) => (e.preventDefault(), rename(m))}>
									<!-- svelte-ignore a11y_autofocus -->
									<input bind:value={draft} aria-label="Name" autofocus onkeydown={(e) => e.key === 'Escape' && (editing = '')} />
									<button class="btn small">Save</button>
									<button type="button" class="btn small ghost" onclick={() => (editing = '')}>Cancel</button>
								</form>
							{:else}
								{m.name || '—'}
							{/if}
						</td>
						<td class="muted">{m.founder_number ? `#${m.founder_number}` : '—'}</td>
						<td><select value={m.level} onchange={(e) => level(m, (e.currentTarget as HTMLSelectElement).value)}><option>admin</option><option>citizen</option><option>traveler</option></select></td>
						<td class="muted">{localDay(m.granted_at)}{m.granted_by ? ` · by ${m.granted_by}` : ''}</td>
						<td class="actions">
							{#if editing !== m.id}<button class="btn small ghost" onclick={() => edit(m)}>Edit</button>{/if}
							{#if m.id !== session.me?.id}<button class="btn small ghost danger" onclick={() => remove(m)}>Remove</button>{/if}
						</td>
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
	.rename { display: flex; gap: 0.4rem; align-items: center; }
	.rename input { padding: 0.35em 0.6em; min-width: 10rem; }
	.actions { text-align: right; white-space: nowrap; }
	.actions .btn + .btn { margin-left: 0.3rem; }
	.danger { color: var(--terracotta); }
</style>
