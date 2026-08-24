import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  useConfirmVoiceItemsMutation,
  useParseVoiceCommandMutation,
} from "@/hooks/useVoiceCommandMutation";
import { Mic, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VoiceCommandItem } from "@shared/types";

interface VoiceCommandOverlayProps {
  children: React.ReactNode;
}

const UNITS = ["szt.", "kg", "g", "l", "ml", "opak."];

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface PreviewState {
  list: { id: string; name: string } | null;
  newListName: string | null;
  items: VoiceCommandItem[];
  selected: boolean[];
}

interface ClarificationState {
  candidates: { id: string; name: string }[];
  items: VoiceCommandItem[];
}

// Web Speech API nie jest częścią standardowej biblioteki DOM w TS, więc deklarujemy
// tylko ten wąski wycinek interfejsu, którego faktycznie używamy.
interface MinimalSpeechRecognitionEvent {
  results: {
    length: number;
    [index: number]: { [index: number]: { transcript: string } };
  };
}

interface MinimalSpeechRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: MinimalSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  start: () => void;
  abort: () => void;
}

// Dostępne jako natywny SpeechRecognition albo prefiksowany webkitSpeechRecognition
// (Chrome/Edge/Android, a także Safari/iOS w kontekście zainstalowanej PWA).
const SpeechRecognitionCtor: (new () => MinimalSpeechRecognition) | undefined =
  typeof window !== "undefined"
    ? (window as unknown as { SpeechRecognition?: new () => MinimalSpeechRecognition })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => MinimalSpeechRecognition })
        .webkitSpeechRecognition
    : undefined;

export function VoiceCommandOverlay({ children }: VoiceCommandOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [clarification, setClarification] = useState<ClarificationState | null>(null);
  // Backend nie trzyma stanu rozmowy - jeśli dopyta o listę (i user odpowie tekstem, nie
  // klikając kandydata), doklejamy odpowiedź do oryginalnego polecenia i parsujemy od nowa.
  const [pendingContext, setPendingContext] = useState<string | null>(null);

  const parseMutation = useParseVoiceCommandMutation();
  const confirmMutation = useConfirmVoiceItemsMutation();

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, preview, clarification, parseMutation.isPending]);

  // Textarea rośnie razem z treścią zamiast rozjeżdżać się w jednej linii.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [inputVal]);

  // Zamknięcie drawera przerywa aktywne nasłuchiwanie - inaczej mikrofon zostałby
  // włączony w tle mimo zamkniętego okna.
  useEffect(() => {
    if (!isOpen) recognitionRef.current?.abort();
  }, [isOpen]);

  const send = (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;

    const fullText = pendingContext ? `${pendingContext} ${trimmed}` : trimmed;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInputVal("");
    setPreview(null);

    parseMutation.mutate(fullText, {
      onSuccess: (data) => {
        if ("needs_clarification" in data) {
          setPendingContext(fullText);
          setClarification({ candidates: data.candidates, items: data.items });
          setMessages((prev) => [...prev, { role: "assistant", text: data.message }]);
          return;
        }

        setPendingContext(null);
        setClarification(null);
        setPreview({
          list: data.list,
          newListName: data.new_list_name,
          items: data.items,
          selected: data.items.map(() => true),
        });
      },
      onError: (error) => {
        setPendingContext(null);
        setClarification(null);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: error instanceof Error ? error.message : "Coś poszło nie tak",
          },
        ]);
      },
    });
  };

  // Kliknięcie proponowanej listy zamiast wpisywania odpowiedzi - oszczędza kolejne
  // zapytanie do AI, bo produkty już mamy z poprzedniej odpowiedzi.
  const pickCandidate = (candidate: { id: string; name: string }) => {
    if (!clarification) return;

    setMessages((prev) => [...prev, { role: "user", text: candidate.name }]);
    setPreview({
      list: candidate,
      newListName: null,
      items: clarification.items,
      selected: clarification.items.map(() => true),
    });
    setClarification(null);
    setPendingContext(null);
  };

  const toggleItem = (index: number, checked: boolean) => {
    setPreview((prev) => {
      if (!prev) return prev;
      const selected = [...prev.selected];
      selected[index] = checked;
      return { ...prev, selected };
    });
  };

  // AI potrafi zmyślić ilość (np. "jajka" -> 30 szt. mimo że nie padła żadna liczba) -
  // zamiast wymuszać poprawkę głosową, można to po prostu poprawić ręcznie przed wysłaniem.
  const updateItemField = (index: number, field: "quantity" | "unit", value: string) => {
    setPreview((prev) => {
      if (!prev) return prev;
      const items = [...prev.items];
      const item = { ...items[index] };
      if (field === "quantity") {
        item.quantity = value === "" ? 0 : Number(value);
      } else {
        item.unit = value;
      }
      items[index] = item;
      return { ...prev, items };
    });
  };

  const cancelPreview = () => {
    setPreview(null);
    setMessages((prev) => [...prev, { role: "assistant", text: "Anulowano." }]);
  };

  const confirmPreview = () => {
    if (!preview) return;
    const itemsToAdd = preview.items.filter((_, i) => preview.selected[i]);
    if (itemsToAdd.length === 0) return;

    confirmMutation.mutate(
      { list: preview.list, newListName: preview.newListName, items: itemsToAdd },
      {
        onSuccess: (targetList) => {
          const itemsList = itemsToAdd.map((i) => i.name).join(", ");
          setMessages((prev) => [
            ...prev,
            { role: "assistant", text: `Dodano do listy "${targetList.name}": ${itemsList}` },
          ]);
          setPreview(null);
        },
        onError: (error) => {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              text: error instanceof Error ? error.message : "Nie udało się dodać produktów",
            },
          ]);
        },
      },
    );
  };

  const handleMic = () => {
    if (!SpeechRecognitionCtor) return;

    // Kliknięcie mikrofonu w trakcie nasłuchiwania przerywa je, zamiast startować drugą sesję.
    if (isListening) {
      recognitionRef.current?.abort();
      return;
    }

    // To co już jest w polu (wpisane albo zdyktowane wcześniej i jeszcze nie wysłane) zostaje -
    // nowa sesja dyktowania dokleja się do tego, zamiast nadpisywać.
    const baseText = inputVal.trim();

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "pl-PL";
    // Nasłuchujemy na żywo (interim results) i tylko wpisujemy rozpoznany tekst do pola -
    // wysyłka to osobny, świadomy krok (klik/Enter), żeby dało się poprawić błędny rozpoznany tekst.
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    // Prosimy o ciągłe nasłuchiwanie (bez ucinania po krótkiej ciszy) - działa dobrze na
    // Chrome/Android, na iOS Safari WebKit i tak potrafi to ignorować (znane ograniczenie platformy).
    recognition.continuous = true;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i]?.[0]?.transcript ?? "";
      }
      setInputVal(baseText && transcript ? `${baseText} ${transcript}` : baseText || transcript);
    };
    // Bez tego błąd (np. brak zgody na mikrofon, brak HTTPS) po prostu nic nie robił -
    // przycisk "działał" ale nigdy nie zaczynał nasłuchiwać, bez żadnej informacji dlaczego.
    recognition.onerror = (event) => {
      setIsListening(false);
      recognitionRef.current = null;
      const reason = event?.error;
      const friendly =
        reason === "not-allowed" || reason === "permission-denied" || reason === "service-not-allowed"
          ? "Brak dostępu do mikrofonu — sprawdź uprawnienia (i czy strona jest na HTTPS)."
          : reason === "no-speech"
            ? "Nie usłyszałem nic — spróbuj ponownie."
            : `Nie udało się użyć mikrofonu (${reason ?? "nieznany błąd"}).`;
      setMessages((prev) => [...prev, { role: "assistant", text: friendly }]);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const isBusy = parseMutation.isPending || confirmMutation.isPending;

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>

      <DrawerContent className="bg-background border-border px-4 pb-[max(24px,env(safe-area-inset-bottom))] data-[vaul-drawer-direction=bottom]:max-h-[92vh]">
        <DrawerHeader className="px-0 pb-2 text-left">
          <DrawerTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            Asystent zakupowy
            <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-semibold rounded-full uppercase tracking-widest">
              Beta
            </span>
          </DrawerTitle>
        </DrawerHeader>

        <div ref={scrollRef} className="flex flex-col gap-2 py-1 min-h-32 max-h-[68vh] overflow-y-auto">
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center text-muted-foreground">
              <Sparkles className="size-6 text-primary/50" />
              <p className="text-sm max-w-70">
                Napisz albo powiedz co chcesz dodać do listy zakupów. Możesz też podać nazwę
                listy, której jeszcze nie masz — zostanie utworzona.
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-snug",
                m.role === "user"
                  ? "self-end bg-primary text-primary-foreground rounded-br-sm"
                  : "self-start bg-secondary text-secondary-foreground rounded-bl-sm",
              )}
            >
              {m.text}
            </div>
          ))}

          {clarification && (
            <div className="self-start flex flex-wrap gap-1.5 max-w-[90%]">
              {clarification.candidates.map((c) => (
                <Button
                  key={c.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => pickCandidate(c)}
                >
                  {c.name}
                </Button>
              ))}
            </div>
          )}

          {preview && (
            <div className="self-start w-full max-w-[92%] rounded-2xl rounded-bl-sm bg-secondary text-secondary-foreground p-3 flex flex-col gap-2.5">
              <p className="text-sm font-medium">
                {preview.list
                  ? `Do listy "${preview.list.name}":`
                  : `Nowa lista "${preview.newListName}" (zostanie utworzona):`}
              </p>

              <div className="flex flex-col gap-2">
                {preview.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={preview.selected[i]}
                      onCheckedChange={(checked) => toggleItem(i, checked === true)}
                    />
                    <span
                      className={cn(
                        "flex-1 min-w-0 truncate",
                        !preview.selected[i] && "line-through text-muted-foreground/70",
                      )}
                    >
                      {item.name}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      value={item.quantity}
                      onChange={(e) => updateItemField(i, "quantity", e.target.value)}
                      disabled={!preview.selected[i]}
                      className="w-12 shrink-0 rounded-md border border-input bg-background px-1.5 py-1 text-right text-xs outline-none focus:ring-2 focus:ring-primary disabled:opacity-40"
                    />
                    <select
                      value={item.unit}
                      onChange={(e) => updateItemField(i, "unit", e.target.value)}
                      disabled={!preview.selected[i]}
                      className="w-16 shrink-0 rounded-md border border-input bg-background px-1 py-1 text-xs outline-none focus:ring-2 focus:ring-primary disabled:opacity-40 appearance-none text-center"
                    >
                      {(UNITS.includes(item.unit) ? UNITS : [item.unit, ...UNITS]).map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={cancelPreview}
                  disabled={confirmMutation.isPending}
                >
                  Anuluj
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="flex-1"
                  onClick={confirmPreview}
                  disabled={confirmMutation.isPending || preview.selected.every((s) => !s)}
                >
                  {confirmMutation.isPending
                    ? "Dodaję..."
                    : `Dodaj (${preview.selected.filter(Boolean).length})`}
                </Button>
              </div>
            </div>
          )}

          {parseMutation.isPending && (
            <div className="self-start flex items-center gap-1 bg-secondary text-secondary-foreground rounded-2xl rounded-bl-sm px-3.5 py-2.5">
              <span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
              <span className="size-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
              <span className="size-1.5 rounded-full bg-current animate-bounce" />
            </div>
          )}
        </div>

        {isListening && (
          <div className="flex items-center justify-center gap-1.5 pt-1 pb-0.5 text-xs font-medium text-primary">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            Słucham...
          </div>
        )}

        <div className="flex items-end gap-1 rounded-3xl border border-input bg-background pl-4 pr-1 py-1 mt-2 transition-shadow focus-within:ring-3 focus-within:ring-ring/50 focus-within:border-ring">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={isListening ? "Słucham..." : 'Np. "dodaj chleb i mleko"'}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(inputVal);
              }
            }}
            disabled={isBusy}
            className="flex-1 min-w-0 max-h-32 resize-none bg-transparent py-2.5 text-base text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50"
          />

          {SpeechRecognitionCtor && (
            <div className="relative shrink-0">
              {isListening && (
                <span className="absolute inset-0 rounded-full bg-primary/50 animate-ping" />
              )}
              <Button
                type="button"
                variant={isListening ? "default" : "ghost"}
                size="icon-lg"
                className="relative rounded-full"
                onClick={handleMic}
                disabled={isBusy}
              >
                <Mic className="size-4" />
              </Button>
            </div>
          )}

          <Button
            type="button"
            size="icon-lg"
            className="rounded-full shrink-0"
            onClick={() => send(inputVal)}
            disabled={isBusy || inputVal.trim() === ""}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
