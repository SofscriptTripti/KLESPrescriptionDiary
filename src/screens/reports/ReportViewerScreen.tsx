import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import WebView from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen, AppHeader, Card, LoadingOverlay, EmptyState } from '../../components';
import { colors, spacing, typography } from '../../theme';
import { resolveReportPath } from '../../api/services/reports';
import type { RootScreenProps } from '../../navigation/types';

/**
 * Ports the "PDFViewer" step shared by RTF_ReportsPage.xaml.cs,
 * ResultReceived.xaml.cs, DiagnosticTestFragment.xaml.cs and
 * RadiologyTestFragment.xaml.cs into one generic screen: those four MAUI
 * pages differ only in how they arrive at a `TestsModel` with `TestFlg`
 * "r" (this screen doesn't care how the caller got here, only the resolved
 * report path(s)).
 *
 * The MAUI original downloads the resolved URL's bytes to a local file and
 * feeds a bundled pdf.js viewer.html (Android) or a raw file:// URL (iOS).
 * react-native-webview can load a remote URL directly, so this rewrite skips
 * the download step entirely:
 *  - iOS: WKWebView renders PDFs natively, so the resolved URL is loaded as-is.
 *  - Android: its WebView has no native PDF renderer, so the URL is wrapped
 *    with Google's public document viewer (a common substitute for the
 *    pdf.js asset bundle the MAUI app shipped).
 */
function toViewableUrl(resolvedUrl: string): string {
  if (Platform.OS === 'android') {
    return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(resolvedUrl)}`;
  }
  return resolvedUrl;
}

export function ReportViewerScreen({ navigation, route }: RootScreenProps<'ReportViewer'>) {
  const { title, reportPaths } = route.params;

  const [selectedPath, setSelectedPath] = useState<string | null>(
    reportPaths.length === 1 ? reportPaths[0] : null,
  );
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const resolve = useCallback(async (path: string) => {
    setResolving(true);
    setLoadError(false);
    setResolvedUrl(null);
    try {
      const url = await resolveReportPath(path);
      if (!url) {
        setLoadError(true);
        Alert.alert('Report', 'Malformed URL Exception');
        return;
      }
      setResolvedUrl(url);
    } catch {
      setLoadError(true);
      Alert.alert('Error', 'Failed to resolve report path');
    } finally {
      setResolving(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPath) resolve(selectedPath);
  }, [selectedPath, resolve]);

  function backOrToList() {
    if (reportPaths.length > 1 && selectedPath) {
      // Multi-report flow: back returns to the picker, not the previous screen.
      setSelectedPath(null);
      setResolvedUrl(null);
      setLoadError(false);
      return;
    }
    navigation.goBack();
  }

  const showPicker = reportPaths.length > 1 && !selectedPath;

  return (
    <Screen>
      <AppHeader
        title={title}
        subtitle={reportPaths.length > 1 ? `${reportPaths.length} reports` : undefined}
        onBack={backOrToList}
      />

      {reportPaths.length === 0 ? (
        <EmptyState icon="file-document-off-outline" title="No report available" />
      ) : showPicker ? (
        <View style={styles.list}>
          {reportPaths.map((path, index) => (
            <TouchableOpacity
              key={`${path}-${index}`}
              onPress={() => setSelectedPath(path)}
              activeOpacity={0.7}>
              <Card style={styles.row}>
                <Icon name="file-document-outline" size={22} color={colors.primary} />
                <Text style={styles.rowLabel}>Report {index + 1}</Text>
                <Icon name="chevron-right" size={22} color={colors.textMuted} />
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      ) : loadError ? (
        <EmptyState
          icon="file-alert-outline"
          title="Unable to load report"
          subtitle="Please check your connection and try again"
        />
      ) : resolvedUrl ? (
        <WebView
          source={{ uri: toViewableUrl(resolvedUrl) }}
          style={styles.webview}
          startInLoadingState
          renderLoading={() => <LoadingOverlay visible label="Opening report…" />}
          onError={() => {
            setLoadError(true);
            Alert.alert('Error', 'Failed to load report');
          }}
          onHttpError={() => {
            setLoadError(true);
            Alert.alert('Error', 'Failed to load report');
          }}
        />
      ) : null}

      <LoadingOverlay visible={resolving} label="Loading report…" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowLabel: { ...typography.bodyStrong, color: colors.textPrimary, flex: 1 },
  webview: { flex: 1, backgroundColor: colors.surface },
});
