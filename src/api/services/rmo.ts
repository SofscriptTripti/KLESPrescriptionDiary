import { COMMON_URL, METHODS, PRESCRIPTION_SERVICE, PTN_PARAM, buildUrl } from '../constants';
import { getJson } from '../client';
import { getUser } from '../../storage/session';
import type { PrescriptionRequest, RMOModel } from '../../types/models';

function ptnUrl(method: string, reqJson: string): string {
  return buildUrl(COMMON_URL, PRESCRIPTION_SERVICE, method, PTN_PARAM, reqJson);
}

/**
 * PrescriptionDiary/GetRMODocList — mirrors RMOPage.xaml.cs's GetRMOListService.
 * If the current user is type "1" (Doctor), the request uses the user's OWN
 * DOCCD instead of the passed-in `docCd` (0 = generic/all, or a specific
 * referring doctor's code) — mirrors the constructor's Doccd resolution.
 */
export async function getRMOList(docCd: number): Promise<RMOModel[]> {
  const user = await getUser();
  const resolvedDocCd = user && user.UserTyp === '1' ? Number(user.DOCCD) || 0 : docCd;

  const req: PrescriptionRequest = {
    COCD: '1',
    DIVCD: 1,
    LOCCD: 1,
    DocCD: resolvedDocCd,
    WardCd: '',
    PtnNo: '0',
    RqDocn: '0',
    OrdNo: 0,
    IPNO: '0',
    DietTypCd: 0,
  };

  const result = await getJson<RMOModel[] | null>(ptnUrl(METHODS.getRMODocList, JSON.stringify(req)));
  return result ?? [];
}
