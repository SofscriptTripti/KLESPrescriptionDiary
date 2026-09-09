import { useCallback } from 'react';
import { NativeModules } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Orientation from 'react-native-orientation-locker';

/**
 * Safely locks orientation to landscape if the native module is available.
 */
export function safeLockToLandscape(): void {
  try {
    if (NativeModules?.Orientation && Orientation?.lockToLandscape) {
      Orientation.lockToLandscape();
    }
  } catch (error) {
    console.warn('Failed to lock orientation to landscape:', error);
  }
}

/**
 * Safely restores orientation to portrait if the native module is available.
 */
export function safeLockToPortrait(): void {
  try {
    if (NativeModules?.Orientation && Orientation?.lockToPortrait) {
      Orientation.lockToPortrait();
    }
  } catch (error) {
    console.warn('Failed to lock orientation to portrait:', error);
  }
}

/**
 * Locks the screen to landscape while this screen is focused and restores
 * portrait on blur/unmount — mirrors the MAUI pages that force landscape in
 * OnAppearing (TestListScreen.xaml.cs, TestDetailsPage.xaml.cs,
 * TestMicroResultsPage.xaml.cs), since their wide Components x Dates grids
 * are designed to be viewed sideways.
 */
export function useLandscapeOnFocus(): void {
  useFocusEffect(
    useCallback(() => {
      safeLockToLandscape();
      return () => {
        safeLockToPortrait();
      };
    }, []),
  );
}

