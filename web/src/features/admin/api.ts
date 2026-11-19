import { api } from "../../lib/api";
import type {
  ApprovalRequestDTO,
  CustomerDTO,
  KitchenReportDTO,
  KitchenStationDTO,
  MealPeriod,
  MenuCategoryDTO,
  SalesReportDTO,
  TableDTO,
} from "@rms/shared";

export interface RoleDTO {
  id: string;
  name: string;
}

export interface AdminUserDTO {
  id: string;
  name: string;
  active: boolean;
  roleId: string;
  roleName: string;
}

export async function fetchUsers() {
  const { data } = await api.get<AdminUserDTO[]>("/api/users");
  return data;
}

export async function fetchRoles() {
  const { data } = await api.get<RoleDTO[]>("/api/roles");
  return data;
}

export async function createUser(input: { name: string; roleId: string; pin: string }) {
  await api.post("/api/users", input);
}

export async function setUserActive(id: string, active: boolean) {
  await api.patch(`/api/users/${id}`, { active });
}

export async function fetchMenuAdmin() {
  const { data } = await api.get<MenuCategoryDTO[]>("/api/menu");
  return data;
}

export async function fetchStationsAdmin() {
  const { data } = await api.get<KitchenStationDTO[]>("/api/stations");
  return data;
}

export async function createStation(input: { name: string; color: string }) {
  await api.post("/api/stations", input);
}

export async function updateStation(id: string, input: Partial<{ name: string; color: string }>) {
  await api.patch(`/api/stations/${id}`, input);
}

export async function deleteStation(id: string) {
  await api.delete(`/api/stations/${id}`);
}

export async function createCategory(input: { name: string; sortOrder: number; mealPeriod: MealPeriod }) {
  await api.post("/api/menu/categories", input);
}

export async function updateCategory(id: string, input: Partial<{ name: string; mealPeriod: MealPeriod }>) {
  await api.patch(`/api/menu/categories/${id}`, input);
}

export async function createMenuItem(input: {
  name: string;
  price: number;
  categoryId: string;
  stationId: string;
  course: "STARTER" | "MAIN" | "DESSERT" | "DRINK";
  preparationTimeEstimateMin: number;
  description?: string;
}) {
  await api.post("/api/menu/items", input);
}

export async function updateMenuItem(
  id: string,
  input: Partial<{
    price: number;
    available: boolean;
    description: string;
    imageUrl: string;
    videoUrl: string;
    allergens: string[];
    includesDrink: boolean;
    isIncludedDrink: boolean;
    isAdult: boolean;
  }>
) {
  await api.patch(`/api/menu/items/${id}`, input);
}

export async function deleteMenuItem(id: string) {
  await api.delete(`/api/menu/items/${id}`);
}

export async function fetchTablesAdmin() {
  const { data } = await api.get<TableDTO[]>("/api/tables");
  return data;
}

export async function createTable(input: { label: string; capacity: number }) {
  await api.post("/api/tables", input);
}

export async function updateTable(id: string, input: Partial<{ label: string; capacity: number }>) {
  await api.patch(`/api/tables/${id}`, input);
}

export async function deleteTable(id: string) {
  await api.delete(`/api/tables/${id}`);
}

export async function fetchApprovals(status?: string) {
  const { data } = await api.get<ApprovalRequestDTO[]>("/api/approvals", { params: { status } });
  return data;
}

export async function decideApprovalRequest(id: string, decision: "APPROVED" | "DENIED") {
  const { data } = await api.patch<ApprovalRequestDTO>(`/api/approvals/${id}`, { decision });
  return data;
}

export async function fetchSalesReport(from: string, to: string) {
  const { data } = await api.get<SalesReportDTO>("/api/reports/sales", { params: { from, to } });
  return data;
}

export async function fetchKitchenReport(from: string, to: string) {
  const { data } = await api.get<KitchenReportDTO>("/api/reports/kitchen", { params: { from, to } });
  return data;
}

export async function fetchCustomers() {
  const { data } = await api.get<CustomerDTO[]>("/api/customers");
  return data;
}
