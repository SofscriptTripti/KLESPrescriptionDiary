import 'react-native-gesture-handler/jestSetup';

// react-native-webview ships no jest mock; its native module isn't present in the
// test renderer, so stub it with a plain View to let component trees mount.
jest.mock('react-native-webview', () => {
  const { forwardRef } = require('react');
  const { View } = require('react-native');
  const WebView = forwardRef((props, ref) => <View ref={ref} {...props} />);
  return { __esModule: true, default: WebView, WebView };
});
