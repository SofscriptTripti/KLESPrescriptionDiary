import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-permissions', () => require('react-native-permissions/mock'));

jest.mock('react-native-orientation-locker', () => ({
  __esModule: true,
  default: {
    lockToPortrait: jest.fn(),
    lockToLandscape: jest.fn(),
    lockToLandscapeLeft: jest.fn(),
    lockToLandscapeRight: jest.fn(),
    unlockAllOrientations: jest.fn(),
    getOrientation: jest.fn(),
    addOrientationListener: jest.fn(),
    removeOrientationListener: jest.fn(),
  },
}));

// react-native-webview ships no jest mock; its native module isn't present in the
// test renderer, so stub it with a plain View to let component trees mount.
jest.mock('react-native-webview', () => {
  const { forwardRef } = require('react');
  const { View } = require('react-native');
  const WebView = forwardRef((props, ref) => <View ref={ref} {...props} />);
  return { __esModule: true, default: WebView, WebView };
});
