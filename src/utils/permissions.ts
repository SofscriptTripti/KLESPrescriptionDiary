import { Platform } from 'react-native';
import { PERMISSIONS, RESULTS, requestMultiple, type Permission } from 'react-native-permissions';

/**
 * Requests the same permission categories the MAUI app's installed package
 * declares (phone, contacts, approximate location, photos/videos, microphone),
 * fired once on app start. NOTE: no current feature in this app actually reads
 * any of these — the app's call/SMS/WhatsApp/email actions hand off to the OS's
 * own apps via URL schemes and need none of this. This exists purely to match
 * the original app's permission-prompt behavior; requesting permissions a real
 * app never uses risks Apple/Google app-review rejection, flagged here so it's
 * easy to trim later if that becomes a problem.
 *
 * iOS has no "phone calls" runtime permission — dialing via `tel:` needs none —
 * so only 4 of the 5 categories apply there.
 */
export async function requestStartupPermissions(): Promise<void> {
  try {
    let permissions: Permission[] = [];

    if (Platform.OS === 'android') {
      const isAndroid13Plus = Number(Platform.Version) >= 33;
      permissions = [
        PERMISSIONS.ANDROID.READ_PHONE_STATE,
        PERMISSIONS.ANDROID.READ_CONTACTS,
        PERMISSIONS.ANDROID.ACCESS_COARSE_LOCATION,
        PERMISSIONS.ANDROID.RECORD_AUDIO,
        ...(isAndroid13Plus
          ? [PERMISSIONS.ANDROID.READ_MEDIA_IMAGES, PERMISSIONS.ANDROID.READ_MEDIA_VIDEO]
          : [PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE]),
      ];
    } else if (Platform.OS === 'ios') {
      permissions = [
        PERMISSIONS.IOS.CONTACTS,
        PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
        PERMISSIONS.IOS.PHOTO_LIBRARY,
        PERMISSIONS.IOS.MICROPHONE,
      ];
    }

    if (permissions.length === 0) return;

    const results = await requestMultiple(permissions);
    if (__DEV__) {
      for (const [permission, status] of Object.entries(results)) {
        const label = status === RESULTS.GRANTED ? 'granted' : status;
        console.log(`[Permissions] ${permission}: ${label}`);
      }
    }
  } catch (err) {
    if (__DEV__) console.log('[Permissions] Startup permission request failed:', err);
  }
}
