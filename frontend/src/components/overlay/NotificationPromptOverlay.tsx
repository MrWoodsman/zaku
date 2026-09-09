import { Bell, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { showErrorToast } from "@/utils/toastHandler";

export function NotificationPromptOverlay({ onComplete }: { onComplete: () => void }) {
  const { isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  const handleToggle = async (checked: boolean) => {
    try {
      if (checked) {
        await subscribe();
      } else {
        await unsubscribe();
      }
    } catch (error) {
      showErrorToast(error as Error);
    }
  };

  return (
    <Card className="fixed inset-0 w-full h-full border-none shadow-none bg-background rounded-none flex flex-col justify-between pt-[max(16px,var(--safe-top))]">
      <CardContent className="flex-2">
        <div className="h-full bg-bacground-tone/50 rounded-xl flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-highlight/20 blur-2xl" />
            <div className="relative flex size-28 items-center justify-center rounded-3xl border border-highlight/20 bg-highlight/10">
              <Bell className="size-12 text-highlight" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </CardContent>

      <CardHeader>
        <CardTitle>Bądź na bieżąco</CardTitle>
        <p className="text-muted-foreground">
          Dostawaj powiadomienie, gdy ktoś inny doda produkty do wspólnej listy. W każdej chwili
          możesz to włączyć lub wyłączyć w Ustawieniach.
        </p>
      </CardHeader>

      <CardFooter className="flex flex-col gap-4 pb-[max(16px,var(--safe-bottom))]">
        <label className="flex w-full items-center justify-between rounded-lg border border-border p-3">
          <span className="text-sm font-medium">Powiadomienia push</span>
          {isLoading ? (
            <Loader2Icon size={18} className="animate-spin text-muted-foreground" />
          ) : (
            <Switch checked={isSubscribed} onCheckedChange={handleToggle} />
          )}
        </label>

        <Button variant="accent" className="w-full" onClick={onComplete}>
          Dalej
        </Button>
      </CardFooter>
    </Card>
  );
}
