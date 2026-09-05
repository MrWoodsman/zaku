import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface Step {
  id: string;
  title: string;
  description: string;
}

interface RecipeStepsFormProps {
  steps: Step[];
  addStep: () => void;
  updateStep: (id: string, field: string, value: string) => void;
  removeStep: (id: string) => void;
}

export function RecipeStepsForm({ steps, addStep, updateStep, removeStep }: RecipeStepsFormProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-semibold text-lg">Kroki przygotowania</h2>
      <div className="flex flex-col gap-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="flex flex-col gap-2 p-3 bg-secondary/10 border border-border/50 rounded-xl relative"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-highlight bg-highlight/10 px-2 py-1 rounded-md border border-highlight/20">
                Krok {index + 1}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeStep(step.id)}
                disabled={steps.length === 1}
                className="h-8 w-8 disabled:opacity-30 bg-destructive/25 border-2 border-destructive/25 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={16} />
              </Button>
            </div>
            <input
              type="text"
              placeholder="Tytuł kroku (opcjonalnie)"
              value={step.title}
              onChange={(e) => updateStep(step.id, "title", e.target.value)}
              className="w-full bg-secondary/20 border border-border/50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 font-medium"
            />
            <textarea
              placeholder="Opisz, co należy zrobić..."
              value={step.description}
              onChange={(e) => updateStep(step.id, "description", e.target.value)}
              rows={5}
              className="w-full bg-secondary/20 border border-border/50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
            />
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        className="w-full gap-2 border-dashed border-2 mt-1"
        onClick={addStep}
      >
        <Plus size={16} /> Dodaj kolejny krok
      </Button>
    </div>
  );
}
