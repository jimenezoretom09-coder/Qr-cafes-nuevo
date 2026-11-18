import { api } from "../../lib/api";

export interface RestaurantProfileDTO {
  id: string;
  name: string;
  description: string | null;
  tone: string | null;
  address: string | null;
  phone: string | null;
  policies: string | null;
  timezone: string;
  currency: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
}

export interface RestaurantHourDTO {
  id: string;
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
  closed: boolean;
}

export interface FaqItemDTO {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
}

export interface UnansweredQuestionDTO {
  id: string;
  question: string;
  timesAsked: number;
  askedAt: string;
}

export async function fetchAssistantProfile() {
  const { data } = await api.get<RestaurantProfileDTO>("/api/assistant/profile");
  return data;
}

export async function updateAssistantProfile(input: Partial<Omit<RestaurantProfileDTO, "id" | "timezone" | "currency">>) {
  const { data } = await api.patch<RestaurantProfileDTO>("/api/assistant/profile", input);
  return data;
}

export async function fetchAssistantHours() {
  const { data } = await api.get<RestaurantHourDTO[]>("/api/assistant/hours");
  return data;
}

export async function saveAssistantHour(
  dayOfWeek: number,
  input: { opensAt: string; closesAt: string; closed: boolean }
) {
  const { data } = await api.put<RestaurantHourDTO>(`/api/assistant/hours/${dayOfWeek}`, input);
  return data;
}

export async function fetchFaq() {
  const { data } = await api.get<FaqItemDTO[]>("/api/assistant/faq");
  return data;
}

export async function createFaq(input: { question: string; answer: string }) {
  const { data } = await api.post<FaqItemDTO>("/api/assistant/faq", input);
  return data;
}

export async function deleteFaq(id: string) {
  await api.delete(`/api/assistant/faq/${id}`);
}

export async function fetchUnansweredQuestions() {
  const { data } = await api.get<UnansweredQuestionDTO[]>("/api/assistant/preguntas-sin-responder");
  return data;
}

export async function promoteUnansweredToFaq(id: string, answer: string) {
  const { data } = await api.post<FaqItemDTO>(`/api/assistant/preguntas-sin-responder/${id}/convertir-en-faq`, {
    answer,
  });
  return data;
}

export async function dismissUnansweredQuestion(id: string) {
  await api.post(`/api/assistant/preguntas-sin-responder/${id}/descartar`);
}
