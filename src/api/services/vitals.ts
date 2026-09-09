/**
 * Vital Signs — ported from View/NewVitalSignsPage.xaml.cs.
 *
 * Flow (matches the MAUI page):
 *  1. GetObsTypListWeb        -> list of obs-type-tree groups for the picker.
 *  2. GetPtnObservationsWeb   -> existing readings for the selected group (IP).
 *     GetOPPtnObservationsWeb -> same, for OP.
 *  3. InsertPtnObsWeb         -> saves newly entered readings.
 */
import { COMMON_URL, METHODS, PRESCRIPTION_SERVICE, PTN_PARAM, buildUrl } from '../constants';
import { getJson, postJson } from '../client';
import { getUserId } from '../../storage/session';
import type {
  InsertTestOrderResponseModel,
  InsertVitalSignModel,
  ObsTypListRequest,
  ObsvGrpWeb,
  PatientModel,
  SaveVitalSignRequestTrans,
  VitalSignsIpRequest,
  VitalSignsNewModel,
  VitalSignsOpRequest,
} from '../../types/models';

function ptnUrl(method: string, reqJson: string): string {
  // See auth.ts's userUrl for why this must be encoded: fetch() (unlike .NET's Uri
  // class) does not auto-escape the raw JSON, and the backend's WCF layer rejects
  // unescaped braces/quotes/spaces outright.
  return buildUrl(COMMON_URL, PRESCRIPTION_SERVICE, method, PTN_PARAM, encodeURIComponent(reqJson));
}

/** Formats a Date the way Newtonsoft.Json serializes an unqualified `DateTime` (no offset). */
function toDotNetDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/**
 * PrescriptionDiary/GetObsTypListWeb — the obs-type-tree groups shown in the
 * page's picker. Ported from GetObsTypListService()/GetObsTypList(): the
 * request is always CommonModel{COCD:"1",DIVCD:"1",LOCCD:"1"} — it does not
 * actually reference the patient or mode at all in the original page. The
 * params are kept here for call-site symmetry with the other vitals calls.
 */
export async function getObsTypList(
  _patient: PatientModel,
  _mode: string,
): Promise<ObsvGrpWeb[]> {
  const req: ObsTypListRequest = { COCD: '1', DIVCD: '1', LOCCD: '1' };
  const result = await getJson<ObsvGrpWeb[] | null>(
    ptnUrl(METHODS.getObsTypListWeb, JSON.stringify(req)),
  );
  return result ?? [];
}

/**
 * PrescriptionDiary/GetPtnObservationsWeb (mode "ip") or
 * GetOPPtnObservationsWeb (mode "op") — existing readings for one obs-type
 * node. Ported from GetVitalSignsService()/GetVitalSigns(): IP requests key
 * off PATIENT_ID (IPNO), OP requests key off PRMNT_PATIENT_NO (PtnNo).
 */
export async function getObservations(
  patient: PatientModel,
  mode: string,
  obsType: ObsvGrpWeb,
): Promise<VitalSignsNewModel[]> {
  let json: string;
  let method: string;

  if (mode === 'ip') {
    const req: VitalSignsIpRequest = {
      COCD: '1',
      DIVCD: 1,
      LOCCD: 1,
      IPNO: Number(patient.PATIENT_ID),
      TreeId: obsType.TreeId,
      ObsvGrpTyp: obsType.LvlOneId,
    };
    json = JSON.stringify(req);
    method = METHODS.getPtnObservationsWeb;
  } else {
    const req: VitalSignsOpRequest = {
      COCD: '1',
      DIVCD: 1,
      LOCCD: 1,
      PtnNo: Number(patient.PRMNT_PATIENT_NO),
      TreeId: obsType.TreeId,
      ObsvGrpTyp: obsType.LvlOneId,
    };
    json = JSON.stringify(req);
    method = METHODS.getOPPtnObservationsWeb;
  }

  const result = await getJson<VitalSignsNewModel[] | null>(ptnUrl(method, json));
  return result ?? [];
}

/**
 * PrescriptionDiary/InsertPtnObsWeb — saves entered readings. Ported from
 * CreateData()/CallInsertPtnObsService()/InsertPtnObs(). Unlike the GET
 * calls above, the JSON body is the POST body itself — no `?strPtn=` query
 * string is appended to this URL.
 *
 * `readings` should be the (non-empty) rows the user entered, each carrying
 * the definitional fields from the fetched observation it corresponds to
 * (OBSMIN/OBSMAX/OBSUNIT/OBSNO/TreeID/LvlOneId/etc.) with OBSVALUE set to the
 * entered text. OBSDATE/OBSTIME2 are stamped to "now" here, matching
 * CreateData() (`arr.OBSDATE = dt; arr.OBSTIME2 = dt;`); OBSTIME is passed
 * through untouched, as the original does.
 */
export async function insertObservations(
  patient: PatientModel,
  mode: string,
  readings: VitalSignsNewModel[],
): Promise<boolean> {
  if (readings.length === 0) return false;

  const now = toDotNetDate(new Date());
  const userId = await getUserId();
  const stamped: VitalSignsNewModel[] = readings.map(r => ({ ...r, OBSDATE: now, OBSTIME2: now }));

  const hasBed = !!patient.PATIENT_BEDNO && patient.PATIENT_BEDNO !== 'anyType{}';

  const header: SaveVitalSignRequestTrans = {
    ip_no: mode === 'ip' ? patient.PATIENT_ID : '0',
    ip_op_flg: mode === 'ip' ? 'I' : 'O',
    ptn_no: patient.PRMNT_PATIENT_NO,
    ref_doc_cd: patient.PATIENT_DOCCD,
    // The original sets this from the currently-selected obs-type-tree node
    // (`obsTypeList[selectedObsType].LvlOneId`); every fetched reading in a
    // group already carries that same LvlOneId, so it can be read back off
    // the readings themselves without threading obsType through this call.
    obsv_grp_typ: stamped[0].LvlOneId,
    OrdDate: now,
    OrdTime: now,
    ward_no: patient.PATIENT_WARDCD,
    bed_no: hasBed ? patient.PATIENT_BEDNO : '',
    crt_usr_id: userId,
    obsv_det: '',
  };

  const body: InsertVitalSignModel = {
    COCD: '1',
    DIVCD: '1',
    LOCCD: '1',
    strHeader: header,
    strDetail: stamped,
    ObsNo: 0,
  };

  const url = buildUrl(COMMON_URL, PRESCRIPTION_SERVICE, METHODS.insertPtnObsWeb);
  const res = await postJson<InsertTestOrderResponseModel | null>(url, JSON.stringify(body));
  return typeof res?.RecordSaved === 'string' && res.RecordSaved.toLowerCase() === 'true';
}
