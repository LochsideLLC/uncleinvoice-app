import { state, user } from "./upgrade-data";
export async function requireUser() { if (!state.signedIn) throw new Error("AUTH_REQUIRED"); return user(); }
export async function getSessionUser() { return state.signedIn ? user() : null; }
export const getRealSessionUser = getSessionUser;
export async function hashPassword(password: string) { return `hashed:${password}`; }
export async function verifyPassword(password: string, hash: string) { return hash === `hashed:${password}`; }
