import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { GenMedicineListModel, MedicineModel, PatientModel } from '../types/models';

export type RootStackParamList = {
  Login: undefined;
  EnterPin: undefined;
  ChangePin: undefined;
  Home: undefined;
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
  TestDetails: { patient: PatientModel; labNo: string; testName: string };
  NewTestRequest: { patient: PatientModel };

  MedicineList: { patient: PatientModel };
  NewMedicineRequest: { patient: PatientModel };
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
