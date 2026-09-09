import { COMMON_URL, METHODS, PRESCRIPTION_SERVICE, PTN_PARAM, buildUrl } from '../constants';
import { getJson } from '../client';
import type {
  MedicalHistoryModel,
  MedicalHistoryRequestModel,
  OPPtnRequestModel,
  PatientModel,
} from '../../types/models';

function ptnUrl(method: string, reqJson: string): string {
  return buildUrl(COMMON_URL, PRESCRIPTION_SERVICE, method, PTN_PARAM, reqJson);
}

/**
 * Mirrors OPPatientListPage.xaml.cs's `dt.ToString("yyyyMMdd'T'hhmm'Z'")`.
 * NOTE: `hh` is lowercase in the original C# format string — the 12-hour-clock
 * specifier, not 24-hour `HH` — which looks like a bug in the source. It is
 * replicated verbatim (not "fixed") since the backend may depend on the exact
 * format it already receives.
 */
function formatRevDt(dt: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = dt.getFullYear();
  const MM = pad(dt.getMonth() + 1);
  const dd = pad(dt.getDate());
  let h12 = dt.getHours() % 12;
  if (h12 === 0) h12 = 12;
  const hh = pad(h12);
  const mm = pad(dt.getMinutes());
  return `${yyyy}${MM}${dd}T${hh}${mm}Z`;
}

/**
 * PrescriptionDiary/GetOPPatientDetailsSql (user type "1" Doctor / "3" Nurse) or
 * GetRMODocOPPatientList (user type "2" RMO). Mirrors GetOPPatientListService /
 * GetOPPatientList in OPPatientListPage.xaml.cs — `docCd` must already be computed
 * by the caller (user's own DOCCD for "1"/"2", or 0 for "3", per the original).
 */
export async function getOPPatientList(userType: string, docCd: number): Promise<PatientModel[]> {
  const req: OPPtnRequestModel = {
    COCD: '1',
    DIVCD: 1,
    LOCCD: 1,
    DocCD: docCd,
    RevDt: formatRevDt(new Date()),
  };
  const json = JSON.stringify(req);
  const method = userType === '2' ? METHODS.getRMODocOPPatientList : METHODS.getOPPatientList;
  const result = await getJson<PatientModel[] | null>(ptnUrl(method, json));
  return result ?? [];
}

/** PrescriptionDiary/GetPtnAdmHistory — mirrors AdmissionList.xaml.cs's GetPtnAdmHistoryService. */
export async function getAdmissionHistory(ptnNo: string): Promise<MedicalHistoryModel[]> {
  const req: MedicalHistoryRequestModel = {
    COCD: '1',
    DIVCD: 1,
    LOCCD: 1,
    PTNNO: ptnNo,
  };
  const json = JSON.stringify(req);
  const result = await getJson<MedicalHistoryModel[] | null>(ptnUrl(METHODS.getPtnAdmHistory, json));
  return result ?? [];
}
