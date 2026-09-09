import { COMMON_URL, METHODS, PRESCRIPTION_SERVICE, PTN_PARAM, buildUrl } from '../constants';
import { getJson, postJson } from '../client';
import type {
  InsertTestOrderRequest,
  InsertTestOrderResponseModel,
  MicroResultModel,
  PatientModel,
  PrescriptionRequest,
  TestComponentModel,
  TestComponentReqModel,
  TestRequestDtlModel,
  TestRequestHeaderModel,
  TestsModel,
  TestSrvModel,
  User,
} from '../../types/models';

function ptnUrl(method: string, reqJson: string): string {
  return buildUrl(COMMON_URL, PRESCRIPTION_SERVICE, method, PTN_PARAM, reqJson);
}

/**
 * PrescriptionDiary/GetPtnTestsSql (IP) or GetOPPtnTestsSql (OP) — the
 * patient's test/lab order list. Mirrors TestListScreen.xaml.cs's
 * PrescriptionRequestModel (method_name switches on `mode`).
 */
export async function getTestList(patient: PatientModel, mode: string): Promise<TestsModel[]> {
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
  };
  const method = isIp ? METHODS.getPatientTests : METHODS.getOPPtnTestsSql;
  const result = await getJson<TestsModel[] | null>(ptnUrl(method, JSON.stringify(req)));
  return result ?? [];
}

export interface GetTestComponentsParams {
  labNo: string;
  /** Optional — see assumption note below. */
  chrgCd?: string;
  testCd?: string;
  cmpntCd?: string;
}

/**
 * PrescriptionDiary/GetPtnTestCmpntsSql (IP) or GetOPPtnTestCmpntsSql (OP) —
 * component/result rows for one lab order. Mirrors TestDetailsPage.xaml.cs's
 * TestComponentReqModel (IP, keyed by IPNO) / TestComponentOPReqModel (OP,
 * keyed by PtnNo).
 *
 * ASSUMPTION: the MAUI screen also sends CHRGCD/TESTCD/CmpntCd (taken from the
 * TestsModel row that was tapped), but this RN app's `TestDetails` route
 * (navigation/types.ts) only carries `labNo`/`testName`, not those extra
 * fields. They default to 0 here on the assumption the backend can resolve a
 * lab order's components from LABNO (+ patient id) alone; pass them through
 * explicitly if the caller happens to have the originating TestsModel row.
 */
export async function getTestComponents(
  patient: PatientModel,
  mode: string,
  { labNo, chrgCd, testCd, cmpntCd }: GetTestComponentsParams,
): Promise<TestComponentModel[]> {
  const isIp = mode !== 'op';
  const req: TestComponentReqModel = {
    COCD: '1',
    DIVCD: 1,
    LOCCD: 1,
    CHRGCD: Number(chrgCd) || 0,
    TESTCD: Number(testCd) || 0,
    LABNO: Number(labNo) || 0,
    CmpntCd: Number(cmpntCd) || 0,
  };
  if (isIp) {
    req.IPNO = Number(patient.PATIENT_ID) || 0;
  } else {
    req.PtnNo = patient.PRMNT_PATIENT_NO;
  }
  const method = isIp ? METHODS.getPtnTestComponents : METHODS.getOPPtnTestCmpntsSql;
  const result = await getJson<TestComponentModel[] | null>(ptnUrl(method, JSON.stringify(req)));
  return result ?? [];
}

/**
 * PrescriptionDiary/GetSrvMstList — the full test/service catalog for new
 * requests. Mirrors NewTestRequestPage.xaml.cs, which appends a bare
 * `?UserID=` (not the usual `?strPtn=<json>`) directly to the method URL.
 */
export async function getAllTestList(): Promise<TestSrvModel[]> {
  const url = buildUrl(COMMON_URL, PRESCRIPTION_SERVICE, METHODS.getAllTestList, '?UserID=');
  const result = await getJson<TestSrvModel[] | null>(url);
  return result ?? [];
}

/**
 * PrescriptionDiary/InsertTestOrder — submits the selected tests as a new
 * order. Mirrors ConfirmTestRequestPopup.xaml.cs's CreateData()/InsertTestOrder()
 * (folded inline into NewTestRequestScreen per this rewrite's flow).
 */
export async function insertTestOrder(
  patient: PatientModel,
  user: User,
  mode: string,
  selectedTests: TestSrvModel[],
): Promise<InsertTestOrderResponseModel> {
  const isIp = mode !== 'op';
  const header: TestRequestHeaderModel = {
    ord_no: 0,
    ip_op_flg: isIp ? 'I' : 'O',
    ip_no: isIp ? patient.PATIENT_ID : '0',
    doc_cd: patient.PATIENT_DOCCD,
    ord_bed_no: patient.PATIENT_BEDNO,
    crt_usr_id: user.USERID,
    ward_no: patient.PATIENT_WARDCD,
    ptn_no: patient.PRMNT_PATIENT_NO,
  };
  const detail: TestRequestDtlModel[] = selectedTests.map((test, index) => ({
    chrg_cd: test.ChrgCd,
    tst_code: test.SrvCd,
    ord_srno: String(index + 1),
  }));
  const body: InsertTestOrderRequest = {
    COCD: '1',
    DIVCD: '1',
    LOCCD: '1',
    strHeader: header,
    strDetail: detail,
  };
  const url = buildUrl(COMMON_URL, PRESCRIPTION_SERVICE, METHODS.insertTestOrder);
  return postJson<InsertTestOrderResponseModel>(url, JSON.stringify(body));
}

/**
 * PrescriptionDiary/GetPtnMicroResultTest — microbiology result for a sample.
 * Mirrors TestMicroResultsPage.xaml.cs, which only sets SAMPLENO on the
 * shared TestComponentReqModel.
 */
export async function getMicroResult(sampleNo: string): Promise<MicroResultModel | null> {
  const req: TestComponentReqModel = { SAMPLENO: sampleNo };
  return getJson<MicroResultModel | null>(ptnUrl(METHODS.getMicroResult, JSON.stringify(req)));
}
