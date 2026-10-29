import { useState } from "react";
import { CheckIcon, PaletteIcon, PencilIcon, PlusIcon, Trash2Icon, UserPlusIcon, UsersIcon } from "lucide-react";
import type { MealSlot, PlannerPerson } from "@shared/types";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HoldToConfirmButton } from "@/components/common/HoldToConfirmButton";
import { SlotToggles } from "@/components/planner/SlotToggles";
import { DEFAULT_SLOTS, PERSON_COLORS } from "@/config/planner";
import {
  useAddPlannerPersonMutation,
  useDeletePlannerPersonMutation,
  useUpdatePlannerPersonMutation,
} from "@/hooks/usePlanner";

interface PlannerPersonOverlayProps {
  children: React.ReactNode;
  people: PlannerPerson[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

// "list" = pick a person; "form" = add one (editing === null) or edit/delete `editing`
type View = { type: "list" } | { type: "form"; editing: PlannerPerson | null };

// Pick whose plan to look at (or "everyone"), add a person, change their name / color, delete them
export function PlannerPersonOverlay({
  children,
  people,
  selectedId,
  onSelect,
}: PlannerPersonOverlayProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ type: "list" });

  const close = () => {
    setOpen(false);
    setView({ type: "list" });
  };

  // With nobody added yet there's nothing to pick, so go straight to the form
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    setView(next && people.length === 0 ? { type: "form", editing: null } : { type: "list" });
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>

      <DrawerContent className="bg-background border-border px-4 pb-[max(24px,var(--safe-bottom))]">
        {view.type === "list" ? (
          <PersonList
            people={people}
            selectedId={selectedId}
            onSelect={(id) => {
              onSelect(id);
              close();
            }}
            onAdd={() => setView({ type: "form", editing: null })}
            onEdit={(person) => setView({ type: "form", editing: person })}
          />
        ) : (
          <PersonForm
            // Remount when switching person, so the fields start from that person's values
            key={view.editing?.id ?? "new"}
            editing={view.editing}
            canGoBack={people.length > 0}
            onBack={() => setView({ type: "list" })}
            onSaved={(person) => {
              // A freshly added person is who you want to plan for right away
              if (!view.editing) onSelect(person.id);
              close();
            }}
            onDeleted={(id) => {
              if (id === selectedId) onSelect(null);
              close();
            }}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

interface PersonListProps {
  people: PlannerPerson[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: () => void;
  onEdit: (person: PlannerPerson) => void;
}

function PersonList({ people, selectedId, onSelect, onAdd, onEdit }: PersonListProps) {
  return (
    <>
      <DrawerHeader className="px-0 text-left">
        <DrawerTitle>Czyj plan?</DrawerTitle>
        <DrawerDescription>
          Wybierz osobę, której posiłki chcesz widzieć i planować. Wpisy bez osoby są wspólne i widać
          je u wszystkich.
        </DrawerDescription>
      </DrawerHeader>

      <div className="flex flex-col gap-2 py-2">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="flex h-12 items-center gap-3 rounded-xl border border-border px-3 text-left transition-colors active:bg-muted"
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <UsersIcon className="size-3.5" />
          </span>
          <span className="flex-1 text-sm font-medium">Wszyscy</span>
          {selectedId === null && <CheckIcon className="size-4 text-highlight" />}
        </button>

        {people.map((person) => (
          <div key={person.id} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelect(person.id)}
              className="flex h-12 flex-1 items-center gap-3 rounded-xl border border-border px-3 text-left transition-colors active:bg-muted"
            >
              <span className="size-6 rounded-full" style={{ backgroundColor: person.color }} />
              <span className="flex-1 truncate text-sm font-medium">{person.name}</span>
              {selectedId === person.id && <CheckIcon className="size-4 text-highlight" />}
            </button>
            <Button
              size="icon-lg"
              variant="ghost"
              aria-label={`Edytuj: ${person.name}`}
              onClick={() => onEdit(person)}
            >
              <PencilIcon className="text-muted-foreground" />
            </Button>
          </div>
        ))}

        <Button variant="secondary" className="mt-1 h-11 w-full" onClick={onAdd}>
          <PlusIcon /> Dodaj osobę
        </Button>
      </div>
    </>
  );
}

interface PersonFormProps {
  editing: PlannerPerson | null;
  canGoBack: boolean;
  onBack: () => void;
  onSaved: (person: PlannerPerson) => void;
  onDeleted: (id: string) => void;
}

function PersonForm({ editing, canGoBack, onBack, onSaved, onDeleted }: PersonFormProps) {
  const [name, setName] = useState(editing?.name ?? "");
  const [color, setColor] = useState<string>(editing?.color ?? PERSON_COLORS[0]);
  const [slots, setSlots] = useState<MealSlot[]>(editing?.slots ?? DEFAULT_SLOTS);

  const { mutate: addPerson, isPending: isAdding } = useAddPlannerPersonMutation();
  const { mutate: updatePerson, isPending: isUpdating } = useUpdatePlannerPersonMutation();
  const { mutate: deletePerson, isPending: isDeleting } = useDeletePlannerPersonMutation();

  const trimmed = name.trim();
  const isCustomColor = !(PERSON_COLORS as readonly string[]).includes(color);
  const isBusy = isAdding || isUpdating || isDeleting;

  const handleSave = () => {
    if (!trimmed || isBusy) return;

    if (editing) {
      updatePerson({ id: editing.id, name: trimmed, color, slots }, { onSuccess: onSaved });
    } else {
      addPerson({ name: trimmed, color, slots }, { onSuccess: onSaved });
    }
  };

  return (
    <>
      <DrawerHeader className="px-0 text-left">
        <DrawerTitle>{editing ? "Edytuj osobę" : "Nowa osoba"}</DrawerTitle>
        <DrawerDescription>
          {editing
            ? "Zmiana jest widoczna dla całej grupy."
            : "Imię i kolor pomogą odróżnić posiłki poszczególnych osób."}
        </DrawerDescription>
      </DrawerHeader>

      <form
        className="flex flex-col gap-4 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Imię"
          maxLength={40}
          className="h-12 bg-secondary/30 text-base"
        />

        <div className="flex flex-wrap items-center gap-3" role="radiogroup" aria-label="Kolor">
          {PERSON_COLORS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              role="radio"
              aria-checked={color === swatch}
              aria-label={swatch}
              onClick={() => setColor(swatch)}
              className={`flex size-11 items-center justify-center rounded-full transition-transform duration-160 ease-snappy active:scale-95 motion-reduce:active:scale-100 ${
                color === swatch ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""
              }`}
              style={{ backgroundColor: swatch }}
            >
              {color === swatch && <CheckIcon className="size-5 text-white" />}
            </button>
          ))}

          {/* Last swatch: any color of your own, via the system color picker */}
          <label
            className={`relative flex size-11 cursor-pointer items-center justify-center rounded-full transition-transform duration-160 ease-snappy active:scale-95 motion-reduce:active:scale-100 ${
              isCustomColor ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""
            }`}
            style={
              isCustomColor
                ? { backgroundColor: color }
                : { backgroundImage: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }
            }
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-white/90 text-neutral-700">
              {isCustomColor ? <CheckIcon className="size-4" /> : <PaletteIcon className="size-3.5" />}
            </span>
            <input
              type="color"
              value={color}
              aria-label="Własny kolor"
              onChange={(e) => setColor(e.target.value)}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
          </label>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Posiłki w ciągu dnia</p>
          <SlotToggles value={slots} onChange={setSlots} />
        </div>

        <div className="flex gap-2 pt-2">
          {canGoBack && (
            <Button type="button" variant="secondary" className="h-12 px-4" onClick={onBack}>
              Wróć
            </Button>
          )}
          <Button
            type="submit"
            variant="raised"
            className="h-12 flex-1 text-base font-semibold"
            disabled={!trimmed || isBusy}
          >
            {editing ? (
              "Zapisz"
            ) : (
              <>
                <UserPlusIcon className="size-5" /> Dodaj osobę
              </>
            )}
          </Button>
        </div>

        {editing && (
          <HoldToConfirmButton
            variant="destructive"
            duration="delete"
            hint="Przytrzymaj, aby usunąć osobę"
            className="h-11 w-full"
            onConfirm={() => deletePerson(editing.id, { onSuccess: () => onDeleted(editing.id) })}
            disabled={isBusy}
          >
            <Trash2Icon /> Usuń osobę (jej posiłki zostaną wspólne)
          </HoldToConfirmButton>
        )}
      </form>
    </>
  );
}
