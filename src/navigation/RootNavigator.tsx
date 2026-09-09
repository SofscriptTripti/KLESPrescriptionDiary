import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { colors } from '../theme';
import { setAuthToken } from '../api/client';
import { getAuthToken, getUser } from '../storage/session';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { EnterPinScreen } from '../screens/auth/EnterPinScreen';
import { ChangePinScreen } from '../screens/auth/ChangePinScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { WardListScreen } from '../screens/patients/WardListScreen';
import { PatientListScreen } from '../screens/patients/PatientListScreen';
import { PatientDetailScreen } from '../screens/patients/PatientDetailScreen';

import { VitalSignsScreen } from '../screens/vitals/VitalSignsScreen';

import { TestListScreen } from '../screens/tests/TestListScreen';
import { TestDetailsScreen } from '../screens/tests/TestDetailsScreen';
import { NewTestRequestScreen } from '../screens/tests/NewTestRequestScreen';

import { MedicineListScreen } from '../screens/medicines/MedicineListScreen';
import { NewMedicineRequestScreen } from '../screens/medicines/NewMedicineRequestScreen';
import { ConfirmMedRequestScreen } from '../screens/medicines/ConfirmMedRequestScreen';
import { PendingRequestScreen } from '../screens/medicines/PendingRequestScreen';

import { DietListScreen } from '../screens/diet/DietListScreen';
import { InsertDietRecordScreen } from '../screens/diet/InsertDietRecordScreen';

import { OPPatientListScreen } from '../screens/patients/OPPatientListScreen';
import { AdmissionListScreen } from '../screens/patients/AdmissionListScreen';
import { NotesScreen } from '../screens/notes/NotesScreen';
import { RMOScreen } from '../screens/rmo/RMOScreen';
import { MedicineScheduleScreen } from '../screens/medicines/MedicineScheduleScreen';
import { ReportViewerScreen } from '../screens/reports/ReportViewerScreen';
import { VitalsGraphScreen } from '../screens/vitals/VitalsGraphScreen';

import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    (async () => {
      const [token, user] = await Promise.all([getAuthToken(), getUser()]);
      if (token) setAuthToken(token);
      setInitialRoute(token && user ? 'Home' : 'Login');
    })();
  }, []);

  if (!initialRoute) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="EnterPin" component={EnterPinScreen} />
      <Stack.Screen name="ChangePin" component={ChangePinScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="WardList" component={WardListScreen} />
      <Stack.Screen name="PatientList" component={PatientListScreen} />
      <Stack.Screen name="PatientDetail" component={PatientDetailScreen} />

      <Stack.Screen name="VitalSigns" component={VitalSignsScreen} />

      <Stack.Screen name="TestList" component={TestListScreen} />
      <Stack.Screen name="TestDetails" component={TestDetailsScreen} />
      <Stack.Screen name="NewTestRequest" component={NewTestRequestScreen} />

      <Stack.Screen name="MedicineList" component={MedicineListScreen} />
      <Stack.Screen name="NewMedicineRequest" component={NewMedicineRequestScreen} />
      <Stack.Screen name="ConfirmMedRequest" component={ConfirmMedRequestScreen} />
      <Stack.Screen name="PendingRequest" component={PendingRequestScreen} />

      <Stack.Screen name="DietList" component={DietListScreen} />
      <Stack.Screen name="InsertDietRecord" component={InsertDietRecordScreen} />

      <Stack.Screen name="OPPatientList" component={OPPatientListScreen} />
      <Stack.Screen name="AdmissionList" component={AdmissionListScreen} />
      <Stack.Screen name="Notes" component={NotesScreen} />
      <Stack.Screen name="RMO" component={RMOScreen} />
      <Stack.Screen name="MedicineSchedule" component={MedicineScheduleScreen} />
      <Stack.Screen name="ReportViewer" component={ReportViewerScreen} />
      <Stack.Screen name="VitalsGraph" component={VitalsGraphScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
