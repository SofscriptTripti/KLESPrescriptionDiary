import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  createMaterialTopTabNavigator,
  MaterialTopTabBar,
  type MaterialTopTabBarProps,
} from '@react-navigation/material-top-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Screen, AppHeader, Button, TextField, Card, LoadingOverlay, EmptyState } from '../../components';
import { colors, radius, spacing, typography } from '../../theme';
import { addDocNote, getNoteHistory, getNoteTemplates, getTemplateDoctorList, saveDocNoteTemplate } from '../../api/services/notes';
import { getMode, getUser } from '../../storage/session';
import type { RootScreenProps } from '../../navigation/types';
import type { DocOrdNurseNotes, TemplateModel } from '../../types/models';

const Tab = createMaterialTopTabNavigator();

function sortByCrtDtTmDesc<T extends { CrtDtTm: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => new Date(b.CrtDtTm).getTime() - new Date(a.CrtDtTm).getTime());
}

/** Mirrors DocOrdNurseNotes.CreatedUsernDate — "<user> Today HH:mm" / "Yesterday" / date. */
function formatNoteMeta(userId: string, crtDtTm: string): string {
  const d = new Date(crtDtTm);
  if (isNaN(d.getTime())) return userId;
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  if (d.toDateString() === now.toDateString()) return `${userId} Today ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `${userId} Yesterday ${time}`;
  const dateStr = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  return `${userId} ${dateStr} ${time}`;
}

/** Mirrors TemplateModel.CreatedTempIdnDate — "<tempId> Today HH:mm" / "Yesterday" / date. */
function formatTemplateMeta(tempId: string, crtDtTm: string): string {
  const d = new Date(crtDtTm);
  if (isNaN(d.getTime())) return tempId;
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  if (d.toDateString() === now.toDateString()) return `${tempId} Today ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `${tempId} Yesterday ${time}`;
  const dateStr = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  return `${tempId} ${dateStr} ${time}`;
}

interface NotesContextValue {
  history: DocOrdNurseNotes[];
  templates: TemplateModel[];
  filteredDoctors: TemplateModel[];
  doctorSearch: string;
  onDoctorSearchChange: (text: string) => void;
  onTemplateTap: (template: TemplateModel) => void;
  onDoctorTap: (doctor: TemplateModel) => void;
}

const NotesContext = React.createContext<NotesContextValue>({
  history: [],
  templates: [],
  filteredDoctors: [],
  doctorSearch: '',
  onDoctorSearchChange: () => {},
  onTemplateTap: () => {},
  onDoctorTap: () => {},
});

function HistoryTab() {
  const { history } = React.useContext(NotesContext);
  return (
    <FlatList
      data={history}
      keyExtractor={(item, idx) => `${item.NoteId}-${idx}`}
      contentContainerStyle={[styles.list, history.length === 0 && styles.emptyContainer]}
      ListEmptyComponent={<EmptyState icon="notebook-outline" title="No notes recorded yet" />}
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.metaText} numberOfLines={1}>
              {formatNoteMeta(item.CrtUsrId, item.CrtDtTm)}
            </Text>
            <Icon
              name={item.IsAuth ? 'shield-check' : 'shield-outline'}
              size={18}
              color={item.IsAuth ? colors.success : colors.textMuted}
            />
          </View>
          <Text style={styles.noteText}>{item.Notes}</Text>
        </Card>
      )}
    />
  );
}

function TemplateTab() {
  const { templates, onTemplateTap } = React.useContext(NotesContext);
  return (
    <FlatList
      data={templates}
      keyExtractor={(item, idx) => `${item.TempId}-${idx}`}
      contentContainerStyle={[styles.list, templates.length === 0 && styles.emptyContainer]}
      ListEmptyComponent={<EmptyState icon="file-document-outline" title="No templates found" />}
      renderItem={({ item }) => (
        <TouchableOpacity activeOpacity={0.8} onPress={() => onTemplateTap(item)}>
          <Card style={styles.card}>
            <Text style={styles.templateTitle}>{formatTemplateMeta(item.TempId, item.CrtDtTm)}</Text>
            <Text style={styles.templatePreview} numberOfLines={3}>
              {item.TemplateData}
            </Text>
          </Card>
        </TouchableOpacity>
      )}
    />
  );
}

function DoctorsTab() {
  const { filteredDoctors, doctorSearch, onDoctorSearchChange, onDoctorTap } = React.useContext(NotesContext);
  return (
    <View style={styles.doctorsWrap}>
      <View style={styles.searchRow}>
        <TextField
          placeholder="Search doctor by name"
          value={doctorSearch}
          onChangeText={onDoctorSearchChange}
          style={styles.searchInput}
        />
        <Text style={styles.countText}>{filteredDoctors.length}</Text>
      </View>
      <FlatList
        data={filteredDoctors}
        keyExtractor={(item, idx) => `${item.Doccd}-${idx}`}
        contentContainerStyle={[styles.list, filteredDoctors.length === 0 && styles.emptyContainer]}
        ListEmptyComponent={<EmptyState icon="doctor" title="No doctors found" />}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.8} onPress={() => onDoctorTap(item)}>
            <Card style={styles.card}>
              <Text style={styles.doctorName}>{item.DocNm}</Text>
            </Card>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

/** Holds the values derived once per load — kept in a ref (not state) since they're read
 * inside callbacks but never drive a re-render on their own. Mirrors the MAUI screen's
 * `mode`/`IpOpFlg`/`IpOpNo`/`docCd` fields. */
interface DerivedContext {
  IpOpFlg: string;
  IpOpNo: string;
  docCd: string;
  userId: string;
  userName: string;
}

export function NotesScreen({ navigation, route }: RootScreenProps<'Notes'>) {
  const { patient } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [history, setHistory] = useState<DocOrdNurseNotes[]>([]);
  const [templates, setTemplates] = useState<TemplateModel[]>([]);
  const [allDoctors, setAllDoctors] = useState<TemplateModel[]>([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  const derived = useRef<DerivedContext>({ IpOpFlg: 'I', IpOpNo: '0', docCd: '0', userId: '', userName: '' });
  // Captured from the nested Tab.Navigator's own `navigation` via a custom tabBar render —
  // lets the Doctors tab jump the tab navigator to "Template" imperatively from outside it.
  const tabNavRef = useRef<{ jumpTo: (name: string) => void } | null>(null);

  const filteredDoctors = useMemo(() => {
    const q = doctorSearch.trim().toLowerCase();
    if (!q) return allDoctors;
    return allDoctors.filter(d => (d.DocNm ?? '').toLowerCase().includes(q));
  }, [allDoctors, doctorSearch]);

  const loadTemplates = useCallback(async (doctorCode: string | number) => {
    try {
      const list = await getNoteTemplates(doctorCode);
      setTemplates(sortByCrtDtTmDesc(list));
    } catch {
      Alert.alert('Error', 'Failed to load note templates');
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [user, mode] = await Promise.all([getUser(), getMode()]);
      const effectiveMode = mode || 'ip';
      const ipOpFlg = effectiveMode === 'ip' ? 'I' : 'O';
      const ipOpNo = effectiveMode === 'ip' ? patient.PATIENT_ID : '0';
      const userType = user?.UserTyp ? String(user.UserTyp) : '';
      const docCd = userType === '1' || userType === '2' ? user?.DOCCD ?? '0' : patient.PATIENT_DOCCD;

      derived.current = {
        IpOpFlg: ipOpFlg,
        IpOpNo: ipOpNo,
        docCd,
        userId: user?.USERID ?? '',
        userName: user?.USERNAME ?? '',
      };

      const [historyList, templateList, doctorList] = await Promise.all([
        getNoteHistory(ipOpNo, patient.PRMNT_PATIENT_NO),
        getNoteTemplates(docCd),
        getTemplateDoctorList(),
      ]);

      setHistory(sortByCrtDtTmDesc(historyList));
      setTemplates(sortByCrtDtTmDesc(templateList));
      setAllDoctors(doctorList);
    } catch {
      Alert.alert('Error', 'Failed to load doctor notes');
    } finally {
      setLoading(false);
    }
  }, [patient]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleTemplateTap = useCallback((template: TemplateModel) => {
    const text = template.TemplateData;
    if (!text) return;
    Alert.alert('', 'Choose an action', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Insert into Notes',
        onPress: () => setNoteText(prev => (prev ? `${prev}\n${text}` : text)),
      },
      {
        text: 'Translate',
        onPress: () => {
          const url = `https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(text)}&op=translate`;
          Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open translator'));
        },
      },
    ]);
  }, []);

  const handleDoctorTap = useCallback(
    (doctor: TemplateModel) => {
      derived.current.docCd = String(doctor.Doccd);
      loadTemplates(doctor.Doccd);
      tabNavRef.current?.jumpTo('Template');
    },
    [loadTemplates],
  );

  const handleSave = useCallback(
    async (isAuth: boolean) => {
      if (!noteText.trim()) {
        Alert.alert('Note required', 'Please enter some note');
        return;
      }
      setSaving(true);
      try {
        const { IpOpFlg, IpOpNo, docCd, userId, userName } = derived.current;
        const payload: DocOrdNurseNotes = {
          IpOpFlg,
          IpOpNo: Number(IpOpNo),
          PtnNo: Number(patient.PRMNT_PATIENT_NO),
          DocCd: Number(docCd),
          DocName: userName,
          NoteId: 0,
          Notes: noteText,
          EposideNo: 0,
          CrtDtTm: new Date().toISOString(),
          CrtUsrId: userId,
          VerNo: 0,
          IsAuth: isAuth,
        };
        const ok = await addDocNote(payload);
        if (ok) {
          Alert.alert('Success', 'Note saved');
          setNoteText('');
          const historyList = await getNoteHistory(IpOpNo, patient.PRMNT_PATIENT_NO);
          setHistory(sortByCrtDtTmDesc(historyList));
        } else {
          Alert.alert('Error', 'Note not saved');
        }
      } catch {
        Alert.alert('Error', 'Some error occurred. Try again');
      } finally {
        setSaving(false);
      }
    },
    [noteText, patient],
  );

  const handleSaveAsTemplate = useCallback(async () => {
    if (!templateName.trim()) {
      Alert.alert('Name required', 'Please enter template name');
      return;
    }
    setSavingTemplate(true);
    try {
      const { docCd, userId, userName } = derived.current;
      const payload: TemplateModel = {
        CrtDtTm: new Date().toISOString(),
        CrtUsrID: userId,
        Doccd: Number(docCd),
        DocNm: userName,
        TempId: templateName.trim(),
        TemplateData: noteText,
        UpdDtTm: null,
        UpdUsrID: '',
      };
      const ok = await saveDocNoteTemplate(payload);
      if (ok) {
        Alert.alert('Success', 'Template saved');
        setTemplateModalVisible(false);
        setTemplateName('');
        await loadTemplates(docCd);
      } else {
        Alert.alert('Error', 'Template not saved');
      }
    } catch {
      Alert.alert('Error', 'Some error occurred. Try again');
    } finally {
      setSavingTemplate(false);
    }
  }, [templateName, noteText, loadTemplates]);

  const contextValue = useMemo<NotesContextValue>(
    () => ({
      history,
      templates,
      filteredDoctors,
      doctorSearch,
      onDoctorSearchChange: setDoctorSearch,
      onTemplateTap: handleTemplateTap,
      onDoctorTap: handleDoctorTap,
    }),
    [history, templates, filteredDoctors, doctorSearch, handleTemplateTap, handleDoctorTap],
  );

  const canSaveAsTemplate = noteText.trim().length > 0;

  // Stable identity (via useCallback) so react/no-unstable-nested-components is satisfied —
  // it also just renders the default MaterialTopTabBar while capturing the tab navigator's
  // own `navigation` helpers into tabNavRef for the Doctors tab's imperative jump.
  const renderTabBar = useCallback((props: MaterialTopTabBarProps) => {
    tabNavRef.current = props.navigation as unknown as { jumpTo: (name: string) => void };
    return <MaterialTopTabBar {...props} />;
  }, []);

  return (
    <Screen>
      <AppHeader title="Doctor's Notes" subtitle={patient.PATIENT_NAME} onBack={() => navigation.goBack()} />

      <NotesContext.Provider value={contextValue}>
        <View style={styles.tabsWrap}>
          <Tab.Navigator
            initialRouteName="Template"
            screenOptions={{
              tabBarActiveTintColor: colors.primary,
              tabBarInactiveTintColor: colors.textMuted,
              tabBarIndicatorStyle: styles.tabIndicator,
              tabBarLabelStyle: styles.tabLabel,
              tabBarStyle: styles.tabBar,
            }}
            tabBar={renderTabBar}>
            <Tab.Screen name="History" component={HistoryTab} />
            <Tab.Screen name="Template" component={TemplateTab} />
            <Tab.Screen name="Doctors" component={DoctorsTab} />
          </Tab.Navigator>
        </View>
      </NotesContext.Provider>

      <View style={styles.composer}>
        <TextField
          placeholder="Enter note..."
          value={noteText}
          onChangeText={setNoteText}
          multiline
          numberOfLines={4}
          style={styles.noteInput}
        />
        {canSaveAsTemplate ? (
          <TouchableOpacity
            style={styles.saveTemplateLink}
            hitSlop={8}
            onPress={() => setTemplateModalVisible(true)}>
            <Icon name="content-save-outline" size={16} color={colors.primary} />
            <Text style={styles.saveTemplateText}>Save as Template</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.buttonRow}>
          <Button label="Clear" variant="outline" onPress={() => setNoteText('')} style={styles.flexButton} />
          <Button label="Save" onPress={() => handleSave(false)} loading={saving} style={styles.flexButton} />
          <Button
            label="Save & Authorize"
            onPress={() => handleSave(true)}
            loading={saving}
            style={styles.flexButton}
          />
        </View>
      </View>

      <Modal
        visible={templateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTemplateModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Save as Template</Text>
            <TextField placeholder="Template name" value={templateName} onChangeText={setTemplateName} />
            <View style={styles.buttonRow}>
              <Button
                label="Cancel"
                variant="outline"
                onPress={() => {
                  setTemplateModalVisible(false);
                  setTemplateName('');
                }}
                style={styles.flexButton}
              />
              <Button label="Save" onPress={handleSaveAsTemplate} loading={savingTemplate} style={styles.flexButton} />
            </View>
          </View>
        </View>
      </Modal>

      <LoadingOverlay visible={loading} label="Loading doctor's notes…" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabsWrap: { flex: 1 },
  tabBar: { backgroundColor: colors.surface, elevation: 0, shadowOpacity: 0 },
  tabIndicator: { backgroundColor: colors.primary, height: 3 },
  tabLabel: { ...typography.captionStrong, textTransform: 'none' },
  list: { padding: spacing.lg, paddingTop: spacing.md },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  card: { marginBottom: spacing.md },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  metaText: { ...typography.captionStrong, color: colors.textSecondary, flexShrink: 1, marginRight: spacing.sm },
  noteText: { ...typography.body, color: colors.textPrimary },
  templateTitle: { ...typography.bodyStrong, color: colors.primary, marginBottom: spacing.xs },
  templatePreview: { ...typography.body, color: colors.textPrimary },
  doctorsWrap: { flex: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, marginBottom: 0 },
  countText: { ...typography.captionStrong, color: colors.textMuted, marginLeft: spacing.sm },
  doctorName: { ...typography.bodyStrong, color: colors.textPrimary },
  composer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
  },
  noteInput: { minHeight: 90, textAlignVertical: 'top', marginBottom: spacing.sm },
  saveTemplateLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  saveTemplateText: { ...typography.captionStrong, color: colors.primary },
  buttonRow: { flexDirection: 'row', gap: spacing.sm },
  flexButton: { flex: 1, paddingHorizontal: spacing.sm },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' },
  modalBox: {
    width: '85%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  modalTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.md },
});
