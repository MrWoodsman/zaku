import {
  addPlannerMealApi,
  addPlannerPersonApi,
  deletePlannerMealApi,
  deletePlannerPersonApi,
  fetchPlannerIngredientsApi,
  fetchPlannerMealsApi,
  fetchPlannerPeopleApi,
  updatePlannerPersonApi,
} from "@/api/planner";
import { showErrorToast } from "@/utils/toastHandler";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// groupId is part of every key, so switching groups doesn't show the old group's plan
const groupKey = () => localStorage.getItem("groupId");

const peopleKey = () => ["planner", "people", groupKey()];
const mealsKey = () => ["planner", "meals", groupKey()];

// PEOPLE
export const usePlannerPeopleQuery = () =>
  useQuery({
    queryKey: peopleKey(),
    queryFn: fetchPlannerPeopleApi,
    refetchInterval: 10000,
  });

export const useAddPlannerPersonMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addPlannerPersonApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: peopleKey() }),
    onError: showErrorToast,
  });
};

export const useUpdatePlannerPersonMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePlannerPersonApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: peopleKey() }),
    onError: showErrorToast,
  });
};

export const useDeletePlannerPersonMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePlannerPersonApi,
    // Their meals stay (as shared), so the meals change too
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: peopleKey() });
      queryClient.invalidateQueries({ queryKey: mealsKey() });
    },
    onError: showErrorToast,
  });
};

// MEALS
export const usePlannerMealsQuery = (from: string, to: string) =>
  useQuery({
    queryKey: [...mealsKey(), from, to],
    queryFn: () => fetchPlannerMealsApi(from, to),
    refetchInterval: 10000,
    // Scrolling / switching days: keep showing the old data instead of flashing a loader
    placeholderData: keepPreviousData,
  });

export const useAddPlannerMealMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addPlannerMealApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mealsKey() }),
    onError: showErrorToast,
  });
};

export const useDeletePlannerMealMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePlannerMealApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: mealsKey() }),
    onError: showErrorToast,
  });
};

// SHOPPING - only fetched while the shopping overlay is open
export const usePlannerIngredientsQuery = (
  from: string,
  to: string,
  personId: string | null,
  enabled: boolean,
) =>
  useQuery({
    queryKey: ["planner", "ingredients", groupKey(), from, to, personId],
    queryFn: () => fetchPlannerIngredientsApi(from, to, personId),
    enabled,
    // The plan can change between two openings, so always re-read it
    staleTime: 0,
  });
