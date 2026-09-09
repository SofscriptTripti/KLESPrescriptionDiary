/**
 * Request/response shapes ported from the MAUI app's Model/*.cs classes.
 * Field names are kept exactly as the backend sends/expects them (including
 * casing) since responses are parsed directly with no remapping layer.
 */

export type UserType = '1' | '2' | '3'; // 1 = Doctor, 2 = RMO, 3 = Nurse/Ward staff

export interface User {
  USERID: string;
  USERNAME: string;
  DOCCD: string;
  DEVICEID?: string;
  deviceIMEI?: string;
  PinCode?: string;
  UserMobileNo?: string;
  UserTyp: UserType | string;
  STRCD?: string;
}

export interface LoginRequest {
  COCD?: string;
  DIVCD?: number;
  LOCCD?: number;
  UserID?: string;
  UserMobileNo?: string;
  DeviceID?: string;
  PINCode?: string;
  ValidFor?: 'Mobile' | 'PIN';
  AppID?: number;
  deviceIMEI?: string;
  deviceID?: string;
  OldAppVersion?: number;
  oldPinCode?: string;
  newPinCode?: string;
}

export interface PrescriptionRequest {
  COCD?: string;
  DIVCD?: number;
  LOCCD?: number;
  DocCD?: number;
  WardCd?: string;
  IPNO?: string;
  PtnNo?: string;
  RqDocn?: string;
  OrdNo?: number;
  DietTypCd?: number;
  ObsvGrpTyp?: string;
  oldPATH?: string;
  RevDt?: string;
}

export interface WardModel {
  WardCd: number;
  WardDcd: string;
  Position?: number;
}

export interface PatientModel {
  PRMNT_PATIENT_NO: string;
  PATIENT_ID: string;
  PATIENT_NAME: string;
  PATIENT_GENDER: 'M' | 'F' | string;
  PATIENT_AGE: string;
  PATIENT_BEDNO: string;
  PATIENT_CLASS: string;
  PATIENT_WING: string;
  WING_DESC: string;
  PATIENT_WARDCD: string;
  PATIENT_ADMSDATE: string;
  PATIENT_MOBILE: string;
  PATIENT_EMAIL: string;
  PATIENT_FLOOR: string;
  PATIENT_WARDNO: string;
  PATIENT_DOCCD: string;
  PATIENT_DOCNM: string;
  DOC_MOBILENO?: string;
  REFED_BYDOC?: string;
}

export interface PendingRequestModel {
  PtnNo: string;
  PtnNm: string;
  RqDocn: string;
  BedNo: string;
  Ward: string;
}

/**
 * Ported from Model/RMOModel.cs — note the unusual lowercase field casing
 * (unlike most other models); kept exact since responses are parsed directly.
 */
export interface RMOModel {
  doccd: string;
  docname: string;
  docspltydcd: string;
  docmobile: string;
  docemail: string;
}

// ---- Vitals ----

export interface ObsvGrpWeb {
  TreeId: number;
  LvlOneId: number;
  LvlOneDesc: string;
}

export interface ArrMatchWordsModel {
  MatchWords: string;
  SRNO: number;
}

export interface VitalSignsNewModel {
  OBSNAME: string;
  OBSDATE: string;
  OBSTIME: string;
  OBSTIME2: string;
  OBSVALUE: string;
  OBSMIN: number;
  OBSMAX: number;
  OBSUNIT: string;
  OBSGRPTYP: number;
  OBSNO: number;
  OBSNRMLMAX: number;
  OBSNRMLMIN: number;
  TreeID: number;
  MedStageId: number;
  MedRecId: number;
  MedRecTreeTypeId: number;
  LvlOneId: number;
  LvlTwoId: number;
  MedRecMRNo: number;
  ArrMatchWords?: ArrMatchWordsModel[];
}

/**
 * Ported from Model/SaveVitalSignRequestTrans.cs — the `strHeader` of
 * InsertPtnObsWeb's request body. NOTE: this replaces a placeholder shape
 * that didn't match the real C# class (which has none of OBSNO/NewValue/etc);
 * these are the actual header fields the backend expects.
 */
export interface SaveVitalSignRequestTrans {
  ip_no: string;
  ref_doc_cd: string;
  obsv_grp_typ: number;
  OrdDate: string;
  OrdTime: string;
  ward_no: string;
  bed_no: string;
  crt_usr_id: string;
  obsv_det: string;
  ptn_no: string;
  ip_op_flg: string;
}

/** Ported from Model/CommonModel.cs — request body for GetObsTypListWeb. */
export interface ObsTypListRequest {
  COCD: string;
  DIVCD: string;
  LOCCD: string;
}

/** Ported from Model/VitalSignsIpReqModel.cs — request body for GetPtnObservationsWeb. */
export interface VitalSignsIpRequest {
  COCD: string;
  DIVCD: number;
  LOCCD: number;
  IPNO: number;
  TreeId: number;
  ObsvGrpTyp: number;
}

/** Ported from Model/VitalSignsOpReqModel.cs — request body for GetOPPtnObservationsWeb. */
export interface VitalSignsOpRequest {
  COCD: string;
  DIVCD: number;
  LOCCD: number;
  PtnNo: number;
  TreeId: number;
  ObsvGrpTyp: number;
}

/** Ported from Model/InsertVitalSignModel.cs — full POST body for InsertPtnObsWeb. */
export interface InsertVitalSignModel {
  COCD: string;
  DIVCD: string;
  LOCCD: string;
  strHeader: SaveVitalSignRequestTrans;
  strDetail: VitalSignsNewModel[];
  ObsNo: number;
}

// ---- Tests ----

export type TestStatus = 1 | 2 | 3 | 4 | 5 | 6 | 10; // pending/collected/rejected/reported/authorised/other/result-received

export interface TestsModel {
  LABNO: string;
  TESTNAME: string;
  TESTORDDATE: string;
  TESTCD: string;
  RadiologyRptPath?: string;
  TESTSTATUS: TestStatus;
  CHRGCD: string;
  cmpntcd?: string;
  TestFlg?: string;
  LABRPTTYP?: string;
  SAMPLENO?: string;
  CrtUserId?: string;
}

/** Ported from Model/TestComponentModel.cs — a single result-component row. */
export interface TestComponentModel {
  SAMPLENO?: string;
  COMPCD: string;
  COMPNAME: string;
  CREATEDT: string;
  ORDNO?: string; // accession no
  UNIT?: string;
  VALUE?: string;
  NRMLVALL?: string;
  NRMLVALH?: string;
  CHRGDESC?: string;
  HEADING?: string;
  LABNO: string;
  ISAUTH?: string;
}

/** Request shape for GetPtnTestCmpntsSql (IP) / GetOPPtnTestCmpntsSql (OP). */
export interface TestComponentReqModel {
  COCD?: string;
  DIVCD?: number;
  LOCCD?: number;
  IPNO?: number;
  PtnNo?: string;
  CHRGCD?: number;
  TESTCD?: number;
  LABNO?: number;
  CmpntCd?: number;
  SAMPLENO?: string;
}

/** Ported from Model/TestSrvModel.cs — a selectable catalog entry (GetSrvMstList). */
export interface TestSrvModel {
  ChrgCd: string;
  ChrgDesc: string;
  SrvCd: string;
  SrvDesc: string;
  SrvCatgCd?: string;
  SrvCatgDesc?: string;
  Position?: number;
}

export interface InsertTestOrderResponseModel {
  RecordSaved: string; // "True" / "False"
  ReturnVal?: string;
  ReturnMsg?: string;
}

/** Ported from Model/TestRequestHeaderModel.cs — order header for InsertTestOrder. */
export interface TestRequestHeaderModel {
  ord_no: number;
  ip_op_flg: string; // "I" | "O"
  ip_no: string;
  doc_cd: string;
  ord_bed_no: string;
  crt_usr_id: string;
  ward_no: string;
  ptn_no: string;
}

/** Ported from Model/TestRequestDtlModel.cs — one selected test line item. */
export interface TestRequestDtlModel {
  ord_srno: string;
  chrg_cd: string;
  tst_code: string;
}

/** Ported from Model/InsertTestOrderModel.cs — POST body for InsertTestOrder. */
export interface InsertTestOrderRequest {
  COCD: string;
  DIVCD: string;
  LOCCD: string;
  strHeader: TestRequestHeaderModel;
  strDetail: TestRequestDtlModel[];
}

/** Ported from Model/MicroResultModel.cs (GetPtnMicroResultTest response). */
export interface MicroResultDataModel {
  RPTSTS?: string;
  SAMPLENO?: string;
  COMPCD?: string;
  TESTVALUE?: string;
  ANTIBIOTICS?: string;
}

export interface MicroResultModel {
  objArrResult: MicroResultDataModel[];
  RptNote?: string;
}

// ---- Medicines ----

export interface GenMedicineListModel {
  gen_cd: string;
  gen_nm: string;
  item_cd: string;
  item_desc: string;
  Doc_Cd?: string;
  DietTypCd?: string;
}

export interface FrequencyModel {
  freq_cd: string;
  freq_desc: string;
  frequency?: string;
  freq_short_desc?: string;
}

export interface CdDcdModel {
  cd: string;
  dcd: string;
  add_info_1?: string;
}

/**
 * Ported from Model/ArrMedSch.cs — one scheduled-dose row for a medicine order.
 * `STDDT`/`STDTM` are the scheduled date/time-of-day (as separate DateTime
 * fields in the C# source — the date part of STDTM is not meaningful, only
 * its time-of-day is); `ACTDTTM` is the actual dose time, unset/epoch if the
 * dose hasn't been given yet.
 */
export interface ArrMedSch {
  ORDDT: string;
  ORDNO: number;
  ORDSRNO: number;
  SCHSRNO: number;
  STDDT: string;
  STDTM: string;
  ACTDTTM: string;
  ACTUSERID?: string;
  ORDSTATUS: number;
  DOSAGESTATUS: number;
  IPOPFlg?: string;
  ORDWARDNO: number;
  ITEMCD?: string;
}

export interface MedicineModel {
  ORDNO: string;
  ORDSRNO: string;
  ORDDT: string;
  ORDSTARTDT: string;
  ORDENDDT: string;
  ORDITEMCD: string;
  ORDWARDNO?: string;
  RouteAdmin?: number;
  RouteAdminDesc?: string;
  ORDERBY?: string;
  ORDTM: string;
  ORDSTARTTM: string;
  ORDENDTM: string;
  ORDITEMDESC: string;
  DOSAGEDESC: string;
  FREQDESC: string;
  ISORDCLOSED: string; // "true" / "false"
  ISORDCANCELLED?: string;
  CrtUserId?: string;
  ArrMedSch?: ArrMedSch[];
}

export interface FavMedRequestModel {
  gen_cd: string;
  gen_nm: string;
  item_cd: string;
  item_desc: string;
}

/** Ported from Model/AllMedicineReqModel.cs — request for GetItemListWithGenNm (browse-all). */
export interface AllMedListRequest {
  COCD: string;
  DIVCD: number;
  LOCCD: number;
  gen_nm: string;
  item_cd: string;
  item_desc: string;
}

/** Ported from Model/FavMedRequestModel.cs — request for GetFavItemListByDoc (favourites-only). */
export interface FavMedListRequest {
  COCD: string;
  DIVCD: string;
  LOCCD: string;
  gen_nm: string;
  item_cd: string;
  item_desc: string;
  Doc_Cd?: string;
}

/** Ported from Model/CommonModel.cs — request for GetFrequencyList/GetDosageDescList/GetRouteOfAdminList. */
export interface CommonRequest {
  COCD: string;
  DIVCD: string;
  LOCCD: string;
}

/** Ported from Model/NewMedReqHdrModel.cs — order header for InsertMedReq. */
export interface NewMedReqHdrModel {
  ip_op_flg: string; // "I" | "O"
  ptn_no: number;
  ip_no: number;
  ord_no: number;
  ord_date: string;
  ord_time: string;
  doc_cd: number;
  EpisodeNo?: number;
  EncounterNo?: number;
  store_code: number;
  ord_bed_no: string;
  crt_usr_id: string;
  RqMnTyp?: string;
  RqMnDoca?: string;
  RqMnDocn?: number;
  ptn_name: string;
  doc_name: string;
  Ward_No: number;
}

/** Ported from Model/NewMedReqDtlModel.cs — one selected-medicine line item. */
export interface NewMedReqDtlModel {
  RQDETL_DOCN?: number;
  RQDETL_SR_NO: number;
  RQDETL_STK_UNIT?: number;
  RQDETL_UNIT?: number;
  RQDETL_UNNM?: number;
  RQDETL_REQ_BY_DT: string;
  ord_srno: number;
  item_code: string;
  Item_desc: string;
  dosage_code: number;
  freq_code: number;
  frequency: number;
  period: number;
  strt_dt: string;
  strt_time: string;
  end_dt: string;
  end_time: string;
  request_qty: number;
  rout_admin: number;
  oth_det?: string;
}

/** Ported from Model/InsertMedicineOrderModel.cs — POST body for InsertMedReq. */
export interface InsertMedicineOrderModel {
  COCD: string;
  DIVCD: number;
  LOCCD: number;
  strHeader: NewMedReqHdrModel;
  strDetail: NewMedReqDtlModel[];
}

/** Ported from Model/MedRequestDtlModel.cs — GetMedReqDtlSql response row (pending request detail). */
export interface MedRequestDtlModel {
  RackNo?: string;
  ShelfNo?: string;
  ItemCd?: string;
  ItemDesc?: string;
  RqQty?: string;
  IssQty?: string;
  CrntQty?: string;
  RqSts?: string;
  RqDocn?: string;
}

// ---- Diet ----

export interface DietModel {
  OrdDate: string;
  OrdTime: string;
  DietTypCd: number;
  DietTyp: string;
  UserId?: string;
  Remarks?: string;
  OrdFlg: number;
  OrdNo: number;
}

export interface DietDetailModel {
  OrdSrNo: number;
  MealTm: string;
  MealTmCd: number;
  MealTmDesc: string;
  DietCd: number;
  DietDesc: string;
  InHouse: boolean;
  Remarks?: string;
  DietQty: number;
  Position?: number;
}

/** Ported from Model/DietRequestModel.cs — used only by GetDietListSql (deliberately
 * narrower than PrescriptionRequest, which the diet-detail call uses instead). */
export interface DietRequestModel {
  COCD: string;
  DIVCD: number;
  LOCCD: number;
  IPNO: string;
}

/** Ported from Model/GetDietNMealByDietTypCd.cs — request for the meal/diet options
 * belonging to one diet type (note: all fields are strings, unlike DietRequestModel). */
export interface GetDietNMealByDietTypCdRequest {
  COCD: string;
  DIVCD: string;
  LOCCD: string;
  DietTypCd: string;
}

/** Ported from Model/SaveDietDetailArray.cs — one row of InsertPtnDiet's `strDetail`. */
export interface SaveDietDetailArray {
  OrdSrNo: number;
  MealTmCd: number;
  MealTmDesc: string;
  DietCd: number;
  DietDesc: string;
  InHouse: boolean;
  Remarks?: string;
  DietQty: number;
  OrdDate: string;
  OrdTime: string;
  DietTypCd: number;
  DietTyp: string;
  UserId: string;
  DocCd: number;
  RefDocCd: number;
  IPNo: number;
  OrdStatus: number;
  WardNo: number;
}

/** Ported from Model/InsertPtnDiet.cs — POST body for InsertPtnDiet. */
export interface InsertPtnDietRequest {
  COCD: string;
  DIVCD: string;
  LOCCD: string;
  DietRemark: string;
  strDetail: SaveDietDetailArray[];
}

// ---- Doctor's Notes (separate NOTES_URL host — see src/api/constants.ts) ----

/**
 * Ported from Model/DocOrdNurseNotes.cs. Field names/casing kept exactly as the
 * DoctorsNote API expects on the wire (including the `EposideNo` typo). Used for
 * both SelDocOrdNurseNotes (history) and AddDocNotes (save) request/response bodies.
 */
export interface DocOrdNurseNotes {
  IpOpFlg: string;
  IpOpNo: number;
  PtnNo: number;
  DocCd: number;
  DocName: string;
  NoteId: number;
  Notes: string;
  EposideNo: number;
  CrtDtTm: string;
  CrtUsrId: string;
  VerNo: number;
  IsAuth: boolean;
}

/**
 * Ported from Model/TemplateModel.cs. Used for GetDocNotesTmpl/SaveDocNoteTmpl
 * (note templates) and, as-is, for GetTmplAddDocList's doctor list (the MAUI
 * source reuses this same shape for both — only Doccd/DocNm are populated there).
 */
export interface TemplateModel {
  CrtDtTm: string;
  CrtUsrID: string;
  Doccd: number;
  DocNm: string;
  TempId: string;
  TemplateData: string;
  UpdDtTm?: string | null;
  UpdUsrID?: string;
}

// ---- OP patient list / Admission history ----

/**
 * Ported from Model/OPPtnRequestModel.cs — request body for GetOPPatientDetailsSql
 * (Doctor/Nurse) and GetRMODocOPPatientList (RMO). `RevDt` is formatted exactly like
 * the MAUI source's `dt.ToString("yyyyMMdd'T'hhmm'Z'")` (note: lowercase `hh`, a
 * 12-hour-clock format string in the original — replicated verbatim, not "fixed").
 */
export interface OPPtnRequestModel {
  COCD: string;
  DIVCD: number;
  LOCCD: number;
  DocCD: number;
  RevDt: string;
}

/** Ported from Model/MedicalHistoryRequestModel.cs — request body for GetPtnAdmHistory. */
export interface MedicalHistoryRequestModel {
  COCD: string;
  DIVCD: number;
  LOCCD: number;
  PTNNO?: string;
}

/**
 * Ported from Model/MedicalHistoryModel.cs (GetPtnAdmHistory response row). `AdmStsCd`
 * drives a status color in the original (1 = amber/"Reserve", 2 = light-green/"Admitted",
 * other = light-red/"Discharged" — see AdmissionList.xaml's bgColor binding + footer legend).
 */
export interface MedicalHistoryModel {
  AdmDt: string;
  DschgDt: string;
  IPNo: string;
  AdmStsCd: number;
}
