import { TicketSlash } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../ui/empty";

export function EmptyDepositPrompt() {
  return (
    <div className="h-full w-full p-4">
        <Empty className="border border-dashed h-full">
          <EmptyHeader>
            <EmptyMedia className="size-14 rounded-2xl bg-highlight/10 text-highlight">
              <TicketSlash className="size-6" />
            </EmptyMedia>
            <EmptyTitle>Miejsce na twoja Kaucje</EmptyTitle>
            <EmptyDescription>Dodawaj swoje bony z kaucja, żeby potem łatwo je odnaleźć</EmptyDescription>
          </EmptyHeader>
        </Empty>
    </div>
  );
}
