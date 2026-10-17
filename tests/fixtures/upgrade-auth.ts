import { state, user } from "./upgrade-data";
export async function requireUser() { if (!state.signedIn) throw new Error("AUTH_REQUIRED"); return user(); }
export async function getSessionUser() { return state.signedIn ? user() : null; }
