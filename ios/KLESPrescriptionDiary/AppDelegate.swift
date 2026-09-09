import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
// react_native_orientation_locker: the module name CocoaPods generates for the
// "react-native-orientation-locker" pod under this project's `use_frameworks!`
// setup. If `pod install` reports a different generated name, update this
// import (and the `Orientation` reference below) to match it.
import react_native_orientation_locker

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "KLESPrescriptionDiary",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  // Lets react-native-orientation-locker's lockToLandscape()/lockToPortrait()
  // actually rotate the app on iPhone (UISupportedInterfaceOrientations alone
  // only sets the allowed set, not which one is active).
  func application(_ application: UIApplication, supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask {
    return Orientation.getOrientation()
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
