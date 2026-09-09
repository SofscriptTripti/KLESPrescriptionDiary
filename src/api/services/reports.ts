import { COMMON_URL, METHODS, PRESCRIPTION_SERVICE, PTN_PARAM, buildUrl } from '../constants';
import { getJson } from '../client';
import type { PrescriptionRequest } from '../../types/models';

/**
 * PrescriptionDiary/GetFilePath — resolves a raw (legacy, backslash-delimited)
 * report path into the absolute URL the file actually lives at. Mirrors the
 * `GetTestsService`/`GetRPT_Path` pair repeated across RTF_ReportsPage.xaml.cs,
 * ResultReceived.xaml.cs, DiagnosticTestFragment.xaml.cs and
 * RadiologyTestFragment.xaml.cs: COCD/DIVCD/LOCCD/DocCD/RqDocn/OrdNo/IPNO/PtnNo
 * are always the same fixed values, and `oldPATH` is the raw path with every
 * backslash doubled (`oldpath.Replace("\\", "\\\\")`).
 *
 * Unlike the MAUI original, this rewrite does not download the resolved URL's
 * bytes to a local file — react-native-webview can load a remote URL directly,
 * so the caller (ReportViewerScreen) just points a WebView at the string this
 * returns.
 */
export async function resolveReportPath(oldPath: string): Promise<string> {
  const req: PrescriptionRequest = {
    COCD: '1',
    DIVCD: 1,
    LOCCD: 1,
    DocCD: 0,
    PtnNo: '0',
    RqDocn: '0',
    OrdNo: 0,
    IPNO: '0',
    oldPATH: oldPath.replace(/\\/g, '\\\\'),
  };
  const url = buildUrl(
    COMMON_URL,
    PRESCRIPTION_SERVICE,
    METHODS.getFilePath,
    PTN_PARAM,
    JSON.stringify(req),
  );
  return getJson<string>(url);
}
