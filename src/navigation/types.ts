import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GenMedicineListModel, MedicineModel, PatientModel, TestsModel } from '../types/models';

export type RootStackParamList = {
  Login: undefined;
  EnterPin: undefined;
  ChangePin: undefined;
  WardList: undefined;
  PatientList: { wardCd?: string } | undefined;
  PatientDetail: { patient: PatientModel };

  VitalSigns: { patient: PatientModel };
  VitalsGraph: {
    patient: PatientModel;
    obsName: string;
    unit: string;
    min: number;
    max: number;
    points: { label: string; value: number }[];
  };

  TestList: { patient: PatientModel };
  // The full tapped row (not just labNo/testName) — GetPtnTestCmpntsSql /
  // GetOPPtnTestCmpntsSql require CHRGCD/TESTCD/CmpntCd from that row too,
  // not just LABNO (see TestComponentReqModel.cs).
  TestDetails: { patient: PatientModel; test: TestsModel };
  // LABRPTTYP "L"/"M" rows route here instead of TestDetails — see TestListScreen.xaml.cs's
  // Handle_ItemTapped and TestMicroResultsPage.xaml.cs.
  TestMicroResults: { test: TestsModel };
  NewTestRequest: { patient: PatientModel };

  MedicineList: { patient: PatientModel };
  // `preselected` is the current cart, threaded back in when "Add New" (on the
  // Confirm/Save screen) returns here to let the user add more before viewing
  // the cart again.
  NewMedicineRequest: { patient: PatientModel; preselected?: GenMedicineListModel[] };
  ConfirmMedRequest: { patient: PatientModel; selected: GenMedicineListModel[] };
  PendingRequest: { patient: PatientModel };
  MedicineSchedule: { patient: PatientModel; medicines: MedicineModel[] };

  DietList: { patient: PatientModel };
  InsertDietRecord: { patient: PatientModel };

  // ---- Phase 2 ----
  OPPatientList: undefined;
  AdmissionList: { patient: PatientModel };
  Notes: { patient: PatientModel };
  RMO: { docCd?: number } | undefined;
  ReportViewer: { title: string; reportPaths: string[] };
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
