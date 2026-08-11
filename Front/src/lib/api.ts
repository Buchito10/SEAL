import { logout, type SessionUser } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: unknown;
  code?: string;
};

type ApiFetchOptions = RequestInit & {
  auth?: boolean;
};

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export type LoginResponse = {
  user: SessionUser;
  needs_profile_completion?: boolean;
};

export type SystemStatus = {
  environment: string;
  storage: {
    mode: "local" | "firebase";
    persistent: boolean;
    external_backup_recommended: boolean;
  };
  ai: {
    configured: boolean;
    mode: "gemini" | "fallback";
    model?: string | null;
  };
  security: {
    http_only_session_cookie: boolean;
    secure_cookie: boolean;
    api_rate_limit_per_minute: number;
  };
  checked_at: string;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CLIENT";
  position?: string | null;
  must_change_password?: boolean;
  status: "PENDING_ACTIVATION" | "ACTIVE" | "DISABLED";
  created_at?: string;
  updated_at?: string;
  last_login_at?: string | null;
  profile_completed?: boolean;
  rfc?: string | null;
  curp?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_zip?: string | null;
  address_country?: string | null;
};

export type CreateUserInput = {
  name: string;
  email: string;
  role: "ADMIN" | "CLIENT";
  position?: string;
};

export type PatchUserInput = {
  name?: string;
  role?: "ADMIN" | "CLIENT";
  position?: string | null;
  rfc?: string;
  curp?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string | null;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  address_country?: string;
  profile_completed?: boolean;
};

export type ClientProfileInput = {
  rfc: string;
  curp: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country: string;
};

export type AssignmentSummary = {
  id: string;
  status: string;
  chat_status?: string;
  contract_id?: string;
  contract_version?: number;
  contract_title?: string | null;
  client_id?: string;
  client_name?: string | null;
  client_email?: string | null;
  assigned_by_name?: string | null;
  created_at?: string;
  updated_at?: string;
  signed_at?: string | null;
  placeholders_required?: string[];
  placeholders_company_values?: Record<string, unknown>;
  placeholders_employee_snapshot?: Record<string, unknown>;
  resolved_html_snapshot?: string;
  events?: AssignmentEvent[];
  approval?: {
    status?: string;
    at?: string;
    by_name?: string | null;
    reason?: string | null;
    pdf?: {
      storage_path?: string;
      hash?: string;
    };
  } | null;
  signature?: {
    storage_path?: string;
    hash?: string;
    bbox?: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      page?: number;
    } | null;
  } | null;
};

export type AssignmentEvent = {
  id: string;
  type: string;
  at: string;
  by?: string;
  by_name?: string | null;
  meta?: Record<string, unknown>;
};

export type AssignmentMessage = {
  id: string;
  assignment_id: string;
  sender_id: string;
  sender_role: "ADMIN" | "CLIENT";
  sender_name?: string | null;
  text: string;
  created_at: string;
};

export type AssignmentPrecheck = {
  contract_id: string;
  version: number;
  required_placeholders: string[];
  required_employee_placeholders: string[];
  required_company_placeholders: string[];
  missing_employee_placeholders: string[];
};

export type AssignmentPrecheckInput = {
  client_id: string;
  contract_id: string;
  contract_version: number;
};

export type CreateAssignmentInput = AssignmentPrecheckInput & {
  initial_message?: string;
  company_values?: Record<string, string>;
};

export type SignAssignmentInput = {
  signature_png_base64: string;
  signature_bbox?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    page?: number;
  };
};

export type AssignmentPdfLink = {
  url: string;
  expires_minutes: number;
};

export type SignatureTokenLink = {
  link: string;
  token: string;
  expires_at: string;
  expires_minutes: number;
};

export type MobileSignatureInfo = {
  assignment_id: string;
  contract_title: string;
  client_name?: string | null;
  status: string;
  chat_status?: string;
  expires_at: string;
};

export type ContractAiAnswer = {
  mode: string;
  answer: string;
  snippets?: string[];
};

export type AdminContract = {
  id: string;
  status: "ACTIVE" | string;
  current_version?: number;
  title: string;
  area: string;
  position: string;
  duration?: string;
  base_placeholders_used?: string[];
  base_last_commit_at?: string | null;
  base_last_commit_by_name?: string | null;
  base_last_commit_message?: string | null;
  created_at?: string;
  updated_at?: string;
  edit_lock?: ContractEditLock | null;
};

export type UploadContractInput = {
  title: string;
  area: string;
  position: string;
  file: File;
};

export type ContractEditLock = {
  locked_by: string;
  locked_by_name?: string | null;
  locked_at: string;
  expires_at: string;
};

export type ContractVersionSummary = {
  version: number;
  display_version: number;
  is_base: boolean;
  last_commit_at?: string | null;
  last_commit_by_name?: string | null;
  last_commit_message?: string | null;
  note?: string | null;
};

export type ContractVersionsResponse = {
  contract_id: string;
  current_version: number;
  versions: ContractVersionSummary[];
};

export type ContractVersionTemplate = {
  contract_id: string;
  version: number;
  template_html: string;
  placeholders_used: string[];
  commits: Array<{
    id: string;
    at: string;
    by: string;
    by_name?: string | null;
    message: string;
  }>;
  is_base: boolean;
};

export type PlaceholderCatalog = {
  employee: Array<{ key: string; label: string }>;
  company: Array<{ key: string; label: string }>;
};

export type ContractVersionsComparison = {
  contract_id: string;
  versions: Array<ContractVersionTemplate & {
    display_version: number;
    note?: string | null;
  }>;
};

export type ContractDraft = {
  id?: string;
  based_on_version: number;
  template_html: string;
  created_by?: string;
  created_by_name?: string;
  created_at?: string;
  updated_at?: string;
  expires_at?: string;
};

export type ContractDraftResponse = {
  draft_id: string;
  draft: ContractDraft;
};

export type AdminAiChat = {
  id: string;
  status: string;
  created_by?: string;
  created_by_name?: string;
  title_hint?: string | null;
  area?: string | null;
  position?: string | null;
  jurisdiction?: string | null;
  language?: string | null;
  ai_last_template_html?: string | null;
  ai_last_generated_at?: string | null;
  disclaimer_text?: string | null;
  published_contract_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AdminAiMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  created_at: string;
  by?: string;
  by_name?: string;
  model?: string;
};

export type AdminAiGenerateResponse = {
  assistant_message: AdminAiMessage;
  template_html?: string | null;
  disclaimer?: string;
};

export type ConfirmPasswordResetInput = {
  token: string;
  newPassword: string;
  acceptsPrivacyNotice?: boolean;
  acceptsDataProtection?: boolean;
  privacyNoticeVersion?: string;
  dataProtectionVersion?: string;
};

export type PasswordLinkInfo = {
  valid: true;
  purpose: "ACCOUNT_ACTIVATION" | "PASSWORD_RESET";
  requires_consent: boolean;
  legal_versions: {
    privacy_notice: string;
    data_protection: string;
  };
};

function buildUrl(path: string) {
  let base = API_URL;

  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1" &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(API_URL)
  ) {
    base = `${window.location.protocol}//${window.location.hostname}:3001`;
  }

  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function readPayload<T>(res: Response): Promise<ApiEnvelope<T> | null> {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;

  try {
    return (await res.json()) as ApiEnvelope<T>;
  } catch {
    return null;
  }
}

function localizeApiMessage(message: string) {
  const translations: Record<string, string> = {
    "Invalid credentials": "Credenciales inválidas",
    "User disabled": "Usuario deshabilitado",
    "Invalid body": "Los datos enviados no son válidos",
    "Not found": "No se encontró el recurso solicitado",
    "Forbidden": "No tienes permiso para realizar esta acción",
    "Chat is closed": "El chat está cerrado",
    "Current password incorrect": "La contraseña actual es incorrecta",
    "PDF not available": "El PDF todavía no está disponible",
    "Assignment must be SIGNED before approval": "El contrato debe estar firmado antes de aprobarse",
    "Assignment must be SIGNED before rejection": "El contrato debe estar firmado antes de rechazarse",
  };
  return translations[message] || message;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}) {
  const { headers, ...initWithAuth } = options;
  const init = { ...initWithAuth };
  delete init.auth;
  const finalHeaders = new Headers(headers);

  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;

  if (!isFormData && init.body !== undefined && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }

  const res = await fetch(buildUrl(path), {
    ...init,
    headers: finalHeaders,
    credentials: "include",
  });

  const payload = await readPayload<T>(res);

  if (!res.ok || !payload?.ok) {
    if (res.status === 401) logout();

    throw new ApiError(
      localizeApiMessage(payload?.message || payload?.error || `Error ${res.status}`),
      res.status,
      payload?.details
    );
  }

  return payload.data as T;
}

export async function login(email: string, password: string) {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify({
      email,
      password,
    }),
  });
}

export function getCurrentSession() {
  return apiFetch<{ user: SessionUser }>("/auth/session");
}

export function logoutSession() {
  return apiFetch<{ logged_out: boolean }>("/auth/logout", {
    method: "POST",
    auth: false,
    body: JSON.stringify({}),
  });
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ changed: boolean; user: SessionUser }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function getSystemStatus() {
  return apiFetch<SystemStatus>("/admin/system/status");
}

export function listUsers() {
  return apiFetch<AdminUser[]>("/admin/users");
}

export function createUser(input: CreateUserInput) {
  return apiFetch<{ user: AdminUser; invitationSent: boolean }>("/admin/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function resendInvitation(id: string) {
  return apiFetch<{ sent: boolean; message: string }>(`/admin/users/${id}/resend-invitation`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function patchUser(id: string, input: PatchUserInput) {
  return apiFetch<AdminUser>(`/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function disableUser(id: string) {
  return apiFetch<{ id: string; status: "DISABLED" }>(`/admin/users/${id}/disable`, {
    method: "PATCH",
  });
}

export function deleteUser(id: string) {
  return apiFetch<{
    id: string;
    deleted: true;
    email_released: true;
    tokens_deleted: number;
    message: string;
  }>(`/admin/users/${id}`, {
    method: "DELETE",
  });
}

export function requestPasswordReset(email: string) {
  return apiFetch<{ message: string }>("/auth/password/request", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ email }),
  });
}

export function listContracts() {
  return apiFetch<AdminContract[]>("/admin/contracts");
}

export function getPlaceholderCatalog() {
  return apiFetch<PlaceholderCatalog>("/admin/contracts/placeholders");
}

export function uploadContract(input: UploadContractInput) {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("area", input.area);
  formData.append("position", input.position);
  formData.append("file", input.file);

  return apiFetch<{ contract: AdminContract }>("/admin/contracts", {
    method: "POST",
    body: formData,
  });
}

export function getContract(id: string) {
  return apiFetch<AdminContract>(`/admin/contracts/${id}`);
}

export function listContractVersions(id: string) {
  return apiFetch<ContractVersionsResponse>(`/admin/contracts/${id}/versions`);
}

export function compareContractVersions(id: string, versions: number[]) {
  return apiFetch<ContractVersionsComparison>(`/admin/contracts/${id}/versions/compare`, {
    method: "POST",
    body: JSON.stringify({ versions }),
  });
}

export function getContractVersionTemplate(id: string, version: number) {
  return apiFetch<ContractVersionTemplate>(`/admin/contracts/${id}/versions/${version}/template`);
}

export function acquireContractLock(id: string) {
  return apiFetch<{ lock: ContractEditLock }>(`/admin/contracts/${id}/lock`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function refreshContractLock(id: string) {
  return apiFetch<{ lock: ContractEditLock }>(`/admin/contracts/${id}/lock/refresh`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function releaseContractLock(id: string) {
  return apiFetch<{ released: boolean }>(`/admin/contracts/${id}/lock`, {
    method: "DELETE",
  });
}

export function saveContractTemplateSameVersion(id: string, version: number, input: { template_html: string; commit: string }) {
  return apiFetch<{ version: ContractVersionTemplate }>(`/admin/contracts/${id}/versions/${version}/template`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function createContractVersion(id: string, input: { from_version: number; template_html: string; commit: string; note?: string }) {
  return apiFetch<{ version: ContractVersionTemplate; current_version: number }>(`/admin/contracts/${id}/versions`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function saveContractDraft(id: string, input: { based_on_version: number; template_html: string }) {
  return apiFetch<ContractDraftResponse>(`/admin/contracts/${id}/drafts`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listContractDrafts(id: string) {
  return apiFetch<ContractDraft[]>(`/admin/contracts/${id}/drafts`);
}

export function getContractDraft(id: string, draftId: string) {
  return apiFetch<ContractDraftResponse>(`/admin/contracts/${id}/drafts/${draftId}`);
}

export function publishContractDraft(
  id: string,
  draftId: string,
  input: { mode: "same_version" | "new_version"; commit: string }
) {
  return apiFetch<{ published: boolean; mode: string; version: ContractVersionTemplate; current_version?: number }>(
    `/admin/contracts/${id}/drafts/${draftId}/publish`,
    { method: "POST", body: JSON.stringify(input) }
  );
}

export function cloneContract(id: string, input: { title?: string; area?: string; position?: string }) {
  return apiFetch<{ contract: AdminContract }>(`/admin/contracts/${id}/clone`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createAdminAiChat(input: {
  title_hint?: string;
  area?: string;
  position?: string;
  jurisdiction?: string;
  language?: string;
}) {
  return apiFetch<AdminAiChat>("/admin/ai-chats", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listAdminAiChats() {
  return apiFetch<AdminAiChat[]>("/admin/ai-chats");
}

export function deleteAdminAiChat(id: string) {
  return apiFetch<{ deleted: boolean }>(`/admin/ai-chats/${id}`, { method: "DELETE" });
}

export function listAdminAiMessages(id: string) {
  return apiFetch<AdminAiMessage[]>(`/admin/ai-chats/${id}/messages`);
}

export function sendAdminAiMessage(id: string, text: string) {
  return apiFetch<AdminAiGenerateResponse>(`/admin/ai-chats/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function saveAdminAiHumanEdit(id: string, input: { template_html: string; edit_note: string }) {
  return apiFetch<{ saved: boolean }>(`/admin/ai-chats/${id}/template/human-edit`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function publishAdminAiChatToContract(id: string, input: { title: string; area: string; position: string }) {
  return apiFetch<AdminContract>(`/admin/ai-chats/${id}/publish-to-contract`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function verifyResetToken(token: string) {
  return apiFetch<PasswordLinkInfo>("/auth/password/verify", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ token }),
  });
}

export function confirmPasswordReset(input: ConfirmPasswordResetInput) {
  return apiFetch<{ changed: boolean; activated: boolean; profile_completed: boolean }>("/auth/password/confirm", {
    method: "POST",
    auth: false,
    body: JSON.stringify(input),
  });
}

export function listAdminAssignments() {
  return apiFetch<AssignmentSummary[]>("/admin/assignments");
}

export function getAdminAssignment(id: string) {
  return apiFetch<AssignmentSummary>(`/admin/assignments/${id}`);
}

export function precheckAssignment(input: AssignmentPrecheckInput) {
  return apiFetch<AssignmentPrecheck>("/admin/assignments/precheck", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function requestAssignmentProfileUpdate(input: AssignmentPrecheckInput) {
  return apiFetch<{ message: string; missing_employee_placeholders?: string[] }>(
    "/admin/assignments/request-profile-update",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
}

export function createAssignment(input: CreateAssignmentInput) {
  return apiFetch<AssignmentSummary>("/admin/assignments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listAssignmentMessages(id: string) {
  return apiFetch<AssignmentMessage[]>(`/admin/assignments/${id}/messages`);
}

export function sendAssignmentMessage(id: string, text: string) {
  return apiFetch<AssignmentMessage>(`/admin/assignments/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function setAssignmentChatStatus(id: string, status: "OPEN" | "CLOSED") {
  return apiFetch<AssignmentSummary>(`/admin/assignments/${id}/chat`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function approveAdminAssignment(id: string) {
  return apiFetch<AssignmentSummary>(`/admin/assignments/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function rejectAdminAssignment(id: string, reason?: string) {
  return apiFetch<AssignmentSummary>(`/admin/assignments/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function getAdminAssignmentPdf(id: string) {
  return apiFetch<AssignmentPdfLink>(`/admin/assignments/${id}/pdf`);
}

export function askAdminAssignmentAi(id: string, question: string) {
  return apiFetch<ContractAiAnswer>(`/admin/assignments/${id}/ai/ask`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

export function listClientAssignments() {
  return apiFetch<AssignmentSummary[]>("/client/assignments");
}

export function getClientAssignment(id: string) {
  return apiFetch<AssignmentSummary>(`/client/assignments/${id}`);
}

export function getClientProfile() {
  return apiFetch<AdminUser>("/client/profile");
}

export function updateClientProfile(input: ClientProfileInput) {
  return apiFetch<AdminUser>("/client/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function markClientAssignmentViewed(id: string) {
  return apiFetch<AssignmentSummary>(`/client/assignments/${id}/view`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function listClientAssignmentMessages(id: string) {
  return apiFetch<AssignmentMessage[]>(`/client/assignments/${id}/messages`);
}

export function sendClientAssignmentMessage(id: string, text: string) {
  return apiFetch<AssignmentMessage>(`/client/assignments/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function signClientAssignment(id: string, input: SignAssignmentInput) {
  return apiFetch<AssignmentSummary>(`/client/assignments/${id}/sign`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createClientSignatureToken(id: string) {
  return apiFetch<SignatureTokenLink>(`/client/assignments/${id}/sign-token`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function getClientAssignmentPdf(id: string) {
  return apiFetch<AssignmentPdfLink>(`/client/assignments/${id}/pdf`);
}

export function getClientAssignmentSignature(id: string) {
  return apiFetch<AssignmentPdfLink>(`/client/assignments/${id}/signature`);
}

export function askClientAssignmentAi(id: string, question: string) {
  return apiFetch<ContractAiAnswer>(`/client/assignments/${id}/ai/ask`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

export function verifyMobileSignatureToken(token: string) {
  return apiFetch<MobileSignatureInfo>(`/signatures/mobile/verify?token=${encodeURIComponent(token)}`, {
    auth: false,
  });
}

export function signMobileAssignment(token: string, input: SignAssignmentInput) {
  return apiFetch<AssignmentSummary>("/signatures/mobile/sign", {
    method: "POST",
    auth: false,
    body: JSON.stringify({ token, ...input }),
  });
}
