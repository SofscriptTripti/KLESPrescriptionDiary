import { COMMON_URL, METHODS, PRESCRIPTION_SERVICE, PTN_PARAM, buildUrl } from '../constants';
import { getJson, postJson } from '../client';
import type {
  CdDcdModel,
  DietDetailModel,
  DietModel,
  DietRequestModel,
  GetDietNMealByDietTypCdRequest,
  InsertPtnDietRequest,
  InsertTestOrderResponseModel,
  PrescriptionRequest,
} from '../../types/models';

function ptnUrl(method: string, reqJson: string): string {
  // See src/api/services/auth.ts's userUrl for why this must be encoded.
  return buildUrl(COMMON_URL, PRESCRIPTION_SERVICE, method, PTN_PARAM, encodeURIComponent(reqJson));
}

/**
 * PrescriptionDiary/GetDietListSql — single call feeding all three Current/Advance/History
 * sub-tabs; the caller splits the flat result by `OrdFlg` (1=history, 2=current, 3=advance),
 * matching DietHistoryPage.xaml.cs's GetDiet().
 */
export async function getDietList(ipno: string): Promise<DietModel[]> {
  const req: DietRequestModel = { COCD: '1', DIVCD: 1, LOCCD: 1, IPNO: ipno };
  const json = JSON.stringify(req);
  const result = await getJson<DietModel[] | null>(ptnUrl(METHODS.getDietList, json));
  return result ?? [];
}

interface GetDietDetailParams {
  ipno: string;
  ordNo: number;
}

/**
 * PrescriptionDiary/GetDietDtlSql — meal-by-meal breakdown for one diet order. Note this
 * uses the wider `PrescriptionRequest` shape (matching Current/Advance/HistoryDietPage's
 * GetDietService), not `DietRequestModel`.
 */
export async function getDietDetail({ ipno, ordNo }: GetDietDetailParams): Promise<DietDetailModel[]> {
  const req: PrescriptionRequest = {
    COCD: '1',
    DIVCD: 1,
    LOCCD: 1,
    DocCD: 0,
    PtnNo: '0',
    RqDocn: '0',
    OrdNo: ordNo,
    IPNO: ipno,
  };
  const json = JSON.stringify(req);
  const result = await getJson<DietDetailModel[] | null>(ptnUrl(METHODS.getDietDetail, json));
  return result ?? [];
}

/** PrescriptionDiary/GetDietTypList — diet-type picker options ({cd, dcd}). */
export async function getDietTypeList(): Promise<CdDcdModel[]> {
  const req = { COCD: '1', DIVCD: '1', LOCCD: '1' };
  const json = JSON.stringify(req);
  const result = await getJson<CdDcdModel[] | null>(ptnUrl(METHODS.getDietTypList, json));
  return result ?? [];
}

/** PrescriptionDiary/GetDietNMealByDietTypCd — meal/diet options for a chosen diet type. */
export async function getDietMealOptions(dietTypCd: string): Promise<DietDetailModel[]> {
  const req: GetDietNMealByDietTypCdRequest = { COCD: '1', DIVCD: '1', LOCCD: '1', DietTypCd: dietTypCd };
  const json = JSON.stringify(req);
  const result = await getJson<DietDetailModel[] | null>(ptnUrl(METHODS.getDietByDietCd, json));
  return result ?? [];
}

/** PrescriptionDiary/InsertPtnDiet — submits a new diet order (POST, unlike the GET calls above). */
export async function insertPtnDiet(payload: InsertPtnDietRequest): Promise<InsertTestOrderResponseModel> {
  const url = buildUrl(COMMON_URL, PRESCRIPTION_SERVICE, METHODS.insertPtnDiet);
  const json = JSON.stringify(payload);
  return postJson<InsertTestOrderResponseModel>(url, json);
}
