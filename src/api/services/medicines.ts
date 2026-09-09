import { COMMON_URL, METHODS, PRESCRIPTION_SERVICE, PTN_PARAM, buildUrl } from '../constants';
import { getJson, postJson } from '../client';
import type {
  AllMedListRequest,
  CdDcdModel,
  CommonRequest,
  FavMedListRequest,
  FrequencyModel,
  GenMedicineListModel,
  InsertMedicineOrderModel,
  InsertTestOrderResponseModel,
  MedRequestDtlModel,
  MedicineModel,
  PatientModel,
  PendingRequestModel,
  PrescriptionRequest,
} from '../../types/models';

function ptnUrl(method: string, reqJson: string): string {
  // See src/api/services/auth.ts's userUrl for why this must be encoded.
  return buildUrl(COMMON_URL, PRESCRIPTION_SERVICE, method, PTN_PARAM, encodeURIComponent(reqJson));
}

/** yyyyMMdd'T'HHmm'Z' — matches MedicineReqPage.xaml.cs's `dt.ToString("yyyyMMdd'T'HHmm'Z'")` (OP mode only). */
function formatRevDt(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}Z`;
}

/**
 * PrescriptionDiary/GetPtnMedOrdSql (IP) or GetOPPtnMedOrdSql (OP) — the
 * patient's current medicine orders. Mirrors MedicineReqPage.xaml.cs's
 * GetMedsService/GetMedicines (fetched once here; All/Active/Closed are
 * derived client-side by the screen from `ISORDCLOSED`, same as the MAUI
 * TabbedPage's three fragments).
 */
export async function getCurrentMedOrders(patient: PatientModel, mode: string): Promise<MedicineModel[]> {
  const isIp = mode !== 'op';
  const req: PrescriptionRequest = {
    COCD: '1',
    DIVCD: 1,
    LOCCD: 1,
    DocCD: 0,
    PtnNo: isIp ? '0' : patient.PRMNT_PATIENT_NO,
    RqDocn: '0',
    OrdNo: 0,
    IPNO: isIp ? patient.PATIENT_ID : '0',
    RevDt: isIp ? undefined : formatRevDt(new Date()),
  };
  const method = isIp ? METHODS.getPatientMedOrd : METHODS.getOPPtnMedOrdSql;
  const result = await getJson<MedicineModel[] | null>(ptnUrl(method, JSON.stringify(req)));
  const list = (result ?? []).filter(Boolean);
  return list.sort((a, b) => (a.ORDDT < b.ORDDT ? 1 : a.ORDDT > b.ORDDT ? -1 : 0));
}

/**
 * Unwraps a medicine-list response that may come back either as a bare array
 * or wrapped as `{ Data: [...] }` — mirrors AllMedicineRequestPage/
 * FavMedicineRequestPage's `SafeJsonHelper.GetList<T>(json, "Data")`, which
 * tolerates either shape.
 */
function unwrapMedList(raw: unknown): GenMedicineListModel[] {
  if (Array.isArray(raw)) return raw as GenMedicineListModel[];
  if (raw && typeof raw === 'object' && Array.isArray((raw as { Data?: unknown }).Data)) {
    return (raw as { Data: GenMedicineListModel[] }).Data;
  }
  return [];
}

/**
 * PrescriptionDiary/GetItemListWithGenNm — the full browse-all medicine
 * catalog. Mirrors AllMedicineRequestPage.xaml.cs's GetMedicineService.
 */
export async function getAllMedicineList(): Promise<GenMedicineListModel[]> {
  const req: AllMedListRequest = {
    COCD: '1',
    DIVCD: 1,
    LOCCD: 1,
    gen_nm: '',
    item_cd: '',
    item_desc: '',
  };
  const raw = await getJson<unknown>(ptnUrl(METHODS.getAllMedsList, JSON.stringify(req)));
  return unwrapMedList(raw);
}

/**
 * PrescriptionDiary/GetFavItemListByDoc — the requesting doctor's favourite
 * medicines only. Mirrors FavMedicineRequestPage.xaml.cs's GetMedicineService
 * (Doc_Cd taken from the selected patient's assigned doctor code).
 */
export async function getFavMedicineList(patient: PatientModel): Promise<GenMedicineListModel[]> {
  const req: FavMedListRequest = {
    COCD: '1',
    DIVCD: '1',
    LOCCD: '1',
    gen_nm: '',
    item_cd: '',
    item_desc: '',
    Doc_Cd: patient.PATIENT_DOCCD,
  };
  const raw = await getJson<unknown>(ptnUrl(METHODS.getFavMedsList, JSON.stringify(req)));
  return unwrapMedList(raw);
}

function commonReq(): string {
  const req: CommonRequest = { COCD: '1', DIVCD: '1', LOCCD: '1' };
  return JSON.stringify(req);
}

/** PrescriptionDiary/GetFrequencyList — mirrors ConfirmNewMedRequestPage.xaml.cs's GetData(). */
export async function getFrequencyList(): Promise<FrequencyModel[]> {
  const result = await getJson<FrequencyModel[] | null>(ptnUrl(METHODS.getFreqList, commonReq()));
  return result ?? [];
}

/** PrescriptionDiary/GetDosageDescList — mirrors ConfirmNewMedRequestPage.xaml.cs's GetData(). */
export async function getDosageDescList(): Promise<CdDcdModel[]> {
  const result = await getJson<CdDcdModel[] | null>(ptnUrl(METHODS.getDosageDescList, commonReq()));
  return result ?? [];
}

/** PrescriptionDiary/GetRouteOfAdminList — mirrors ConfirmNewMedRequestPage.xaml.cs's GetData(). */
export async function getRouteOfAdminList(): Promise<CdDcdModel[]> {
  const result = await getJson<CdDcdModel[] | null>(ptnUrl(METHODS.getRouteOfAdminList, commonReq()));
  return result ?? [];
}

/**
 * PrescriptionDiary/InsertMedReq — submits the confirmed medicine request.
 * Mirrors ConfirmNewMedRequestPage.xaml.cs's CreateData()/InsertMedicineRequest
 * (response reuses InsertTestOrderResponseModel's `RecordSaved` shape, same as
 * the original C# code did).
 */
export async function insertMedicineOrder(payload: InsertMedicineOrderModel): Promise<boolean> {
  const url = buildUrl(COMMON_URL, PRESCRIPTION_SERVICE, METHODS.insertMedicineOrder);
  const res = await postJson<InsertTestOrderResponseModel | null>(url, JSON.stringify(payload));
  return String(res?.RecordSaved).toLowerCase() === 'true';
}

/**
 * PrescriptionDiary/GetMedReqListSql — pending medicine-request queue for a
 * ward. Mirrors PendingRequestFragment.xaml.cs's GetPendingReqService.
 */
export async function getPendingRequestList(wardCd: string): Promise<PendingRequestModel[]> {
  const req: PrescriptionRequest = {
    COCD: '1',
    DIVCD: 1,
    LOCCD: 1,
    PtnNo: '0',
    RqDocn: '0',
    WardCd: wardCd,
    OrdNo: 0,
    IPNO: '0',
  };
  const result = await getJson<PendingRequestModel[] | null>(ptnUrl(METHODS.getMedReqList, JSON.stringify(req)));
  return result ?? [];
}

/**
 * PrescriptionDiary/GetMedReqDtlSql — item-level detail for one pending
 * request row. Mirrors PendingRequestPage.xaml.cs's GetPendingReqService.
 */
export async function getPendingRequestDetail(ptnNo: string, rqDocn: string): Promise<MedRequestDtlModel[]> {
  const req: PrescriptionRequest = {
    COCD: '1',
    DIVCD: 1,
    LOCCD: 1,
    PtnNo: ptnNo,
    RqDocn: rqDocn,
    WardCd: '0',
    OrdNo: 0,
    IPNO: '0',
  };
  const result = await getJson<MedRequestDtlModel[] | null>(ptnUrl(METHODS.getMedReqDetail, JSON.stringify(req)));
  return result ?? [];
}
