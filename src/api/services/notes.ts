/**
 * Doctor's Notes module — the one module that talks to a separate plain-HTTP
 * backend host (NOTES_URL) rather than the main hospital API. Every call here is
 * built as `${NOTES_URL}${METHODS.xxx}?Key1=val1&...` (named query params), not
 * the `?strPtn=<json>` pattern used by the rest of the app.
 */

import { METHODS, NOTES_URL } from '../constants';
import { getText, postJsonRaw } from '../client';
import type { DocOrdNurseNotes, TemplateModel } from '../../types/models';

const CO_DIV_LOC = 'CoCd=1&Div=1&Loc=1';

/**
 * Mirrors NotesScreen.xaml.cs's SafeDeserializeList<T>: the GET endpoints on this
 * host sometimes reply with something other than a clean JSON array, so only
 * parse when the trimmed body actually looks like one — otherwise treat it as empty.
 */
function safeParseList<T>(text: string): T[] {
  const trimmed = (text ?? '').trim();
  if (!trimmed.startsWith('[')) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** Success on the POST endpoints here is a bare `"true"` (case-insensitive) response
 * text, not JSON — mirrors the `responseJson.Equals("true", StringComparison.OrdinalIgnoreCase)`
 * checks in NotesScreen.xaml.cs / InsertTemplatePopup.xaml.cs. */
function isSuccessResponse(text: string): boolean {
  return (text ?? '').trim().toLowerCase() === 'true';
}

/** DoctorsNote/SelDocOrdNurseNotes — note history for one patient (IP no + permanent patient no). */
export async function getNoteHistory(
  ipOpNo: string | number,
  ptnNo: string | number,
): Promise<DocOrdNurseNotes[]> {
  const url = `${NOTES_URL}${METHODS.selDocOrdNurseNotes}?${CO_DIV_LOC}&IPNO=${ipOpNo}&PtnNo=${ptnNo}`;
  const text = await getText(url);
  return safeParseList<DocOrdNurseNotes>(text);
}

/** DoctorsNote/GetDocNotesTmpl — note templates authored by one doctor. `TempId` is left
 * empty and `DoctorSplCd` is always 0, matching the MAUI source's fixed defaults. */
export async function getNoteTemplates(doctorCode: string | number): Promise<TemplateModel[]> {
  const url = `${NOTES_URL}${METHODS.getDocNotesTmpl}?${CO_DIV_LOC}&TempId=&DoctorCode=${doctorCode}&DoctorSplCd=0`;
  const text = await getText(url);
  return safeParseList<TemplateModel>(text);
}

/** DoctorsNote/GetTmplAddDocList — the list of doctors to browse templates by (Doctors tab). */
export async function getTemplateDoctorList(): Promise<TemplateModel[]> {
  const url = `${NOTES_URL}${METHODS.getTmplAddDocList}?${CO_DIV_LOC}`;
  const text = await getText(url);
  return safeParseList<TemplateModel>(text);
}

/** DoctorsNote/AddDocNotes — POST; saves (or saves & authorizes, depending on `note.IsAuth`)
 * a note. Returns whether the save succeeded. */
export async function addDocNote(note: DocOrdNurseNotes): Promise<boolean> {
  const url =
    `${NOTES_URL}${METHODS.addDocNotes}?${CO_DIV_LOC}` + '&SessionId=1&Sessionstate=0&ModCd=0&SubModCd=0';
  const text = await postJsonRaw(url, JSON.stringify(note));
  return isSuccessResponse(text);
}

/** DoctorsNote/SaveDocNoteTmpl — POST; saves the current note text as a reusable template. */
export async function saveDocNoteTemplate(template: TemplateModel): Promise<boolean> {
  const url = `${NOTES_URL}${METHODS.saveDocNoteTmpl}?${CO_DIV_LOC}`;
  const text = await postJsonRaw(url, JSON.stringify(template));
  return isSuccessResponse(text);
}
