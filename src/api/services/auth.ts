import {
  COMMON_URL,
  LOGIN_SERVICE,
  METHODS,
  PRESCRIPTION_SERVICE,
  USER_PARAM,
  buildUrl,
} from '../constants';
import { getText, setAuthToken } from '../client';
import { setAuthTokenStorage } from '../../storage/session';
import type { LoginRequest, User } from '../../types/models';

/**
 * Each step below mirrors one MAUI method exactly, including its response
 * parsing quirks (ValidateUser compares a bare lowercase "true" string;
 * UpdUserMst/UpdUserPinCd JSON-decode a quoted string and compare "True").
 */

function userUrl(method: string, reqJson: string): string {
  // .NET's `Uri` class silently percent-encodes invalid characters (`{`, `"`, spaces,
  // etc.) even when the MAUI source does plain string concatenation — fetch() does
  // not, so the JSON blob must be encoded explicitly or the server's WCF layer
  // rejects it outright ("Expecting state 'Element'.. Encountered 'Text'").
  return buildUrl(COMMON_URL, LOGIN_SERVICE, method, USER_PARAM, encodeURIComponent(reqJson));
}

/** Login/ValidateUser — used both for the mobile-number step and the PIN step. */
export async function validateUser(req: LoginRequest): Promise<boolean> {
  const json = JSON.stringify(req);
  const result = await getText(userUrl(METHODS.validateUser, json));
  return result === 'true';
}

/** Login/UpdUserMst — registers/refreshes the device against the mobile number. */
export async function updateUserMst(req: LoginRequest): Promise<boolean> {
  const json = JSON.stringify(req);
  const result = await getText(userUrl(METHODS.updUserMst, json));
  const parsed = JSON.parse(result) as string;
  return parsed === 'True';
}

/** Login/GetUserMst — fetches the doctor/user record. */
export async function getUserMst(req: LoginRequest): Promise<User | null> {
  const json = JSON.stringify(req);
  const result = await getText(userUrl(METHODS.getUserMst, json));
  const user = JSON.parse(result) as User | null;
  return user?.DOCCD || user?.USERID ? user : null;
}

/** Login/UpdUserPinCd — change PIN. */
export async function updateUserPin(req: LoginRequest): Promise<boolean> {
  const json = JSON.stringify(req);
  const result = await getText(userUrl(METHODS.updUserPinCd, json));
  const parsed = JSON.parse(result) as string;
  return parsed?.toLowerCase() === 'true';
}

/**
 * PrescriptionDiary/userlogin — fetches the API auth token using the app's
 * fixed service-account credentials (same as the MAUI client). Arms it on the
 * shared HTTP client (in-memory, via setAuthToken) AND persists it to
 * AsyncStorage (via setAuthTokenStorage) — without the latter, the token
 * vanishes the moment the app process is killed, and RootNavigator's
 * "already logged in?" check on next launch fails, bouncing back to Login
 * even though the mobile number + PIN are still valid.
 */
export async function fetchAuthToken(): Promise<string> {
  const url = buildUrl(
    COMMON_URL,
    PRESCRIPTION_SERVICE,
    METHODS.getAuthToken,
    '?UId=mobuser&UPwd=mob@andro$user',
  );
  const result = await getText(url);
  const token = JSON.parse(result) as string;
  setAuthToken(token);
  await setAuthTokenStorage(token);
  return token;
}
