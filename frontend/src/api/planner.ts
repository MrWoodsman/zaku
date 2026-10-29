import type {
  AddMealPayload,
  PlannerIngredient,
  PlannerMeal,
  PlannerPerson,
  PlannerPersonPayload,
} from "@shared/types";
import { fetchWithGroup } from "./api";

const JSON_HEADERS = { "Content-Type": "application/json" };

// Every call here fails the same way: the backend's message, or a fallback
const send = async (url: string, options: RequestInit, fallback: string) => {
  const response = await fetchWithGroup(url, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || fallback);
  }

  return response.json();
};

// PEOPLE
export const fetchPlannerPeopleApi = (): Promise<PlannerPerson[]> =>
  send(
    `/api/v1/planner/people`,
    { method: "GET", headers: JSON_HEADERS },
    "Nie udało się pobrać osób",
  );

export const addPlannerPersonApi = (payload: PlannerPersonPayload): Promise<PlannerPerson> =>
  send(
    `/api/v1/planner/people`,
    { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(payload) },
    "Nie udało się dodać osoby",
  );

export const updatePlannerPersonApi = ({
  id,
  ...payload
}: PlannerPersonPayload & { id: string }): Promise<PlannerPerson> =>
  send(
    `/api/v1/planner/people/${id}`,
    { method: "PUT", headers: JSON_HEADERS, body: JSON.stringify(payload) },
    "Nie udało się zapisać osoby",
  );

export const deletePlannerPersonApi = (id: string) =>
  send(`/api/v1/planner/people/${id}`, { method: "DELETE" }, "Nie udało się usunąć osoby");

// MEALS (from / to = yyyy-MM-dd, inclusive)
export const fetchPlannerMealsApi = (from: string, to: string): Promise<PlannerMeal[]> =>
  send(
    `/api/v1/planner/meals?from=${from}&to=${to}`,
    { method: "GET", headers: JSON_HEADERS },
    "Nie udało się pobrać planu posiłków",
  );

export const addPlannerMealApi = (payload: AddMealPayload): Promise<{ id: string }> =>
  send(
    `/api/v1/planner/meals`,
    { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(payload) },
    "Nie udało się dodać posiłku",
  );

export const deletePlannerMealApi = (id: string) =>
  send(`/api/v1/planner/meals/${id}`, { method: "DELETE" }, "Nie udało się usunąć posiłku");

// SHOPPING - ingredients of the planned recipes, summed
export const fetchPlannerIngredientsApi = (
  from: string,
  to: string,
  personId: string | null,
): Promise<PlannerIngredient[]> => {
  const person = personId ? `&person_id=${encodeURIComponent(personId)}` : "";
  return send(
    `/api/v1/planner/ingredients?from=${from}&to=${to}${person}`,
    { method: "GET", headers: JSON_HEADERS },
    "Nie udało się pobrać składników",
  );
};
