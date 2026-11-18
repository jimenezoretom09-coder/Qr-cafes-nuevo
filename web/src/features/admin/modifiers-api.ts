import { api } from "../../lib/api";

export interface ModifierDTO {
  id: string;
  name: string;
  priceDelta: number;
}

export interface ModifierGroupDTO {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  modifiers: ModifierDTO[];
  itemIds: string[];
  itemNames: string[];
}

export async function fetchModifierGroups() {
  const { data } = await api.get<ModifierGroupDTO[]>("/api/modifier-groups");
  return data;
}

export async function createModifierGroup(input: { name: string; minSelect: number; maxSelect: number }) {
  await api.post("/api/modifier-groups", input);
}

export async function updateModifierGroup(
  id: string,
  input: Partial<{ name: string; minSelect: number; maxSelect: number }>
) {
  await api.patch(`/api/modifier-groups/${id}`, input);
}

export async function deleteModifierGroup(id: string) {
  await api.delete(`/api/modifier-groups/${id}`);
}

export async function addModifier(groupId: string, input: { name: string; priceDelta: number }) {
  await api.post(`/api/modifier-groups/${groupId}/modifiers`, input);
}

export async function updateModifier(id: string, input: Partial<{ name: string; priceDelta: number }>) {
  await api.patch(`/api/modifiers/${id}`, input);
}

export async function deleteModifier(id: string) {
  await api.delete(`/api/modifiers/${id}`);
}

export async function setModifierGroupItems(groupId: string, itemIds: string[]) {
  await api.put(`/api/modifier-groups/${groupId}/items`, { itemIds });
}
