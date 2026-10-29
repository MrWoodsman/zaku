import { useState } from "react";
import type { MealSlot, PlannerPerson } from "@shared/types";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { SlotToggles } from "@/components/planner/SlotToggles";
import { useUpdatePlannerPersonMutation } from "@/hooks/usePlanner";

interface PlannerSlotsOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: PlannerPerson | null;
}

// Quick switch for the meals of the day this person sees - saved on every tap
export function PlannerSlotsOverlay({ open, onOpenChange, person }: PlannerSlotsOverlayProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-background border-border px-4 pb-[max(24px,var(--safe-bottom))]">
        <DrawerHeader className="px-0 text-left">
          <DrawerTitle>Posiłki w ciągu dnia</DrawerTitle>
          <DrawerDescription>
            {person
              ? `Które posiłki ma widzieć ${person.name}. Posiłek, który już coś zawiera, jest zawsze widoczny.`
              : "Wybierz osobę, żeby ustawić jej posiłki."}
          </DrawerDescription>
        </DrawerHeader>

        {/* Remounted per person, so the toggles start from that person's saved meals */}
        {open && person && <SlotsEditor key={person.id} person={person} />}
      </DrawerContent>
    </Drawer>
  );
}

function SlotsEditor({ person }: { person: PlannerPerson }) {
  const [slots, setSlots] = useState<MealSlot[]>(person.slots);
  const { mutate: updatePerson } = useUpdatePlannerPersonMutation();

  return (
    <div className="py-2">
      <SlotToggles
        value={slots}
        onChange={(next) => {
          setSlots(next);
          updatePerson({ id: person.id, name: person.name, color: person.color, slots: next });
        }}
      />
    </div>
  );
}
