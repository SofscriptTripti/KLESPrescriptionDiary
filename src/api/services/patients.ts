import { COMMON_URL, METHODS, PRESCRIPTION_SERVICE, PTN_PARAM, buildUrl } from '../constants';
import { getJson } from '../client';
import type { PatientModel, PrescriptionRequest, WardModel } from '../../types/models';

function ptnUrl(method: string, reqJson: string): string {
  // See src/api/services/auth.ts's userUrl for why this must be encoded.
  return buildUrl(COMMON_URL, PRESCRIPTION_SERVICE, method, PTN_PARAM, encodeURIComponent(reqJson));
}

/** PrescriptionDiary/GetWardListSql — ward multi-select list (nurse/ward-staff flow). */
export async function getWardList(): Promise<WardModel[]> {
  const json = JSON.stringify({});
  const result = await getJson<WardModel[] | null>(ptnUrl(METHODS.getWardList, json));
  return result ?? [];
}

interface GetPatientListParams {
  docCd: number;
  wardCd?: string;
}

/**
 * PrescriptionDiary/GetPatientDetailsSql (user type "1" — Doctor) or
 * GetRMODocPatientList (user type "2" — RMO). Also used ward-scoped (DocCD=0,
 * WardCd set) for the nurse/ward-staff flow.
 */
export async function getPatientList(
  userType: string,
  { docCd, wardCd = '' }: GetPatientListParams,
): Promise<PatientModel[]> {
  const req: PrescriptionRequest = {
    COCD: '1',
    DIVCD: 1,
    LOCCD: 1,
    DocCD: docCd,
    WardCd: wardCd,
    PtnNo: '0',
    RqDocn: '0',
    OrdNo: 0,
    IPNO: '0',
    DietTypCd: 0,
  };
  const json = JSON.stringify(req);
  const method = userType === '2' ? METHODS.getRMODocPatientList : METHODS.getPatientList;
  const result = await getJson<PatientModel[] | null>(ptnUrl(method, json));
  return result ?? [];
}
