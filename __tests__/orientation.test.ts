import { safeLockToLandscape, safeLockToPortrait } from '../src/utils/orientation';
import { NativeModules } from 'react-native';
import Orientation from 'react-native-orientation-locker';

describe('orientation utils', () => {
  it('does not throw when NativeModules.Orientation is missing', () => {
    const origModule = NativeModules.Orientation;
    delete (NativeModules as any).Orientation;
    expect(() => safeLockToLandscape()).not.toThrow();
    expect(() => safeLockToPortrait()).not.toThrow();
    (NativeModules as any).Orientation = origModule;
  });

  it('calls Orientation.lockToLandscape when NativeModules.Orientation is present', () => {
    (NativeModules as any).Orientation = {};
    safeLockToLandscape();
    expect(Orientation.lockToLandscape).toHaveBeenCalled();
    safeLockToPortrait();
    expect(Orientation.lockToPortrait).toHaveBeenCalled();
  });
});
