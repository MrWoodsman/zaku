import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks, Zap, Share2, Smartphone } from "lucide-react";

const steps = [
  { title: "Witaj!", desc: "To Twoja nowa lista zakupów.", icon: ListChecks },
  { title: "Szybkie dodawanie", desc: "Wpisz produkt i naciśnij plus.", icon: Zap },
  { title: "Udostępnianie", desc: "Wyślij listę do domowników.", icon: Share2 },
  { title: "Szybki dostęp", desc: "Dodaj do ekranu głównego telefonu.", icon: Smartphone },
];

export function OnBoardingOverlay({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const StepIcon = steps[currentStep].icon;

  return (
    <Card className="fixed inset-0 w-full h-full border-none shadow-none bg-background rounded-none flex flex-col justify-between pt-[max(16px,env(safe-area-inset-top))]">
      {" "}
      <CardContent className="flex-2">
        <div className="h-full bg-bacground-tone/50 rounded-xl flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-highlight/20 blur-2xl" />
            <div className="relative flex size-28 items-center justify-center rounded-3xl border border-highlight/20 bg-highlight/10">
              <StepIcon className="size-12 text-highlight" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </CardContent>
      <CardHeader>
        <CardTitle>{steps[currentStep].title}</CardTitle>
        <p className="text-muted-foreground">{steps[currentStep].desc}</p>
      </CardHeader>
      <CardFooter className="flex flex-col gap-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        {/* KROPKI (Indykatory) */}
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-all ${i === currentStep ? "bg-highlight w-6" : "bg-progres-dots"}`}
            />
          ))}
        </div>

        {/* PRZYCISKI */}
        <div className="flex w-full gap-2">
          {currentStep > 0 && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setCurrentStep((s) => s - 1)}
            >
              Wstecz
            </Button>
          )}
          <Button
            type="button"
            className="flex-1"
            onClick={() =>
              currentStep < steps.length - 1 ? setCurrentStep((s) => s + 1) : onComplete()
            }
          >
            {currentStep === steps.length - 1 ? "Zaczynamy" : "Dalej"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
