import type { ServiceRequestDTO } from "@rms/shared";
import { api } from "../../lib/api";

export async function fetchServiceRequests() {
  const { data } = await api.get<ServiceRequestDTO[]>("/api/service-requests");
  return data;
}

export async function attendServiceRequest(id: string) {
  await api.post(`/api/service-requests/${id}/attend`);
}
