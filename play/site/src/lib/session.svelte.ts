// who is signed in, for every page: loaded once, changed by signing in, up or out
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import { api, ApiError, type Me } from './api';

export const session = $state<{ me: Me | null; ready: boolean }>({ me: null, ready: false });

export async function loadMe() {
	try {
		session.me = await api<Me>('/me');
	} catch (e) {
		if (!(e instanceof ApiError) || e.status !== 401) console.error(e);
		session.me = null;
	}
	session.ready = true;
	return session.me;
}

/** sign-up is by invite only: `invite` the code of an admin's invite link, used up as the passkey is made */
export async function signUp(name: string, invite: string) {
	const options = await api('/passkey/register/options', { json: { name, invite } });
	const response = await startRegistration({ optionsJSON: options });
	await api('/passkey/register/finish', { json: response });
	return loadMe();
}

export async function signIn() {
	const options = await api('/passkey/login/options', { method: 'POST' });
	const response = await startAuthentication({ optionsJSON: options });
	await api('/passkey/login/finish', { json: response });
	return loadMe();
}

export async function signOut() {
	await api('/signout', { method: 'POST' });
	session.me = null;
}
