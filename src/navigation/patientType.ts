import type { User } from '../types/models';

/** Mirrors MainScreen.xaml.cs's Handle_Clicked/Handle_Clicked_1: IP routes to
 * PatientList for UserTyp "1"/"2", WardList for UserTyp "3" (RMO/ward-level
 * user); OP always routes to OPPatientList regardless of UserTyp. */
export function patientTypeRoute(type: 'ip' | 'op', user: User | null): 'PatientList' | 'WardList' | 'OPPatientList' {
  if (type === 'op') return 'OPPatientList';
  return user?.UserTyp === '3' ? 'WardList' : 'PatientList';
}
