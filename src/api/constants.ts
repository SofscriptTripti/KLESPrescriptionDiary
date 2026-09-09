/**
 * Transcribed 1:1 from the MAUI app's Utilities/Constants.cs so the backend
 * contract (base URLs, method-name path segments, query param names) is
 * byte-identical between the old and new clients.
 *
 * NOTE: the original app concatenates the raw (non-URL-encoded) JSON request
 * body directly onto the query string after `?strPtn=`/`?strUser=` — the
 * backend expects exactly that shape, so `buildUrl` below deliberately does
 * not encode it either.
 */

export const COMMON_URL = 'https://nmc.klehospital.org//WEBAPINEW/api/';
export const NOTES_URL = 'http://114.143.79.62/DoctorsOrderApi/Api/DoctorsNote/';

export const LOGIN_SERVICE = 'Login/';
export const PRESCRIPTION_SERVICE = 'PrescriptionDiary/';

export const PTN_PARAM = '?strPtn=';
export const USER_PARAM = '?strUser=';

export const METHODS = {
  // Login/
  getUserMst: 'GetUserMst',
  validateUser: 'ValidateUser',
  chkSecurity: 'ChkSecurity',
  chkActiveUser: 'ChkActiveUser',
  validatePtnAppVersion: 'ValidatePtnAppVersion',
  updUserMst: 'UpdUserMst',
  updUserPinCd: 'UpdUserPinCd',

  // PrescriptionDiary/
  getPatientList: 'GetPatientDetailsSql',
  getPatientObservation: 'GetPtnObservationsSql',
  getPatientTests: 'GetPtnTestsSql',
  getPatientMedOrd: 'GetPtnMedOrdSql',
  getAdmListTilDt: 'GetAdmListTilDt',
  getRMODocList: 'GetRMODocList',
  getFilePath: 'GetFilePath',
  getWardList: 'GetWardListSql',
  getMedReqList: 'GetMedReqListSql',
  getMedReqDetail: 'GetMedReqDtlSql',
  getDietTypList: 'GetDietTypList',
  getDietByDietCd: 'GetDietNMealByDietTypCd',
  getDietList: 'GetDietListSql',
  getDietDetail: 'GetDietDtlSql',
  getObsTypList: 'GetObsTypList',
  getObsTypes: 'GetObservationsTypes',
  getRMODocPatientList: 'GetRMODocPatientList',
  getPtnTestComponents: 'GetPtnTestCmpntsSql',
  getItemListWithGenName: 'GetItemListWithGenNm',
  getMicroResult: 'GetPtnMicroResultTest',
  getAllTestList: 'GetSrvMstList',
  getAuthToken: 'userlogin',
  insertTestOrder: 'InsertTestOrder',
  getAllMedsList: 'GetItemListWithGenNm',
  getFavMedsList: 'GetFavItemListByDoc',
  getFreqList: 'GetFrequencyList',
  getDosageDescList: 'GetDosageDescList',
  getRouteOfAdminList: 'GetRouteOfAdminList',
  insertMedicineOrder: 'InsertMedReq',
  updtNstMedScheduleSts: 'UpdtNstMedScheduleSts',
  insertPtnDiet: 'InsertPtnDiet',
  insertPtnObs: 'InsertPtnObs',
  getObsTypListWeb: 'GetObsTypListWeb',
  getPtnObservationsWeb: 'GetPtnObservationsWeb',
  insertPtnObsWeb: 'InsertPtnObsWeb',

  // OP methods
  getOPPatientList: 'GetOPPatientDetailsSql',
  getRMODocOPPatientList: 'GetRMODocOPPatientList',
  getPtnAdmHistory: 'GetPtnAdmHistory',
  getOPPtnTestsSql: 'GetOPPtnTestsSql',
  getOPPtnTestCmpntsSql: 'GetOPPtnTestCmpntsSql',
  getOPPtnMedOrdSql: 'GetOPPtnMedOrdSql',
  getOPPtnObservationsSql: 'GetOPPtnObservationsSql',
  getOPPtnObservationsWeb: 'GetOPPtnObservationsWeb',

  // notes (separate NOTES_URL host)
  addDocNotes: 'AddDocNotes',
  updDocOrdNurseNotesAuth: 'UpdDocOrdNurseNotesAuth',
  selDocOrdNurseNotes: 'SelDocOrdNurseNotes',
  getDocNotesTmpl: 'GetDocNotesTmpl',
  saveDocNoteTmpl: 'SaveDocNoteTmpl',
  getTmplAddDocList: 'GetTmplAddDocList',
} as const;

/** Session/AsyncStorage keys — mirrors MAUI's Preferences key names. */
export const STORAGE_KEYS = {
  userMobileNo: 'usermobileno',
  userDetail: 'userdetail',
  userType: 'usertype',
  userId: 'userid',
  selectedPatient: 'selectedpatient',
  authToken: 'userToken',
  mode: 'mode',
} as const;

/** Builds `${base}${...segments}` — plain string concatenation, matching Constants.cs. */
export function buildUrl(...segments: string[]): string {
  return segments.join('');
}
