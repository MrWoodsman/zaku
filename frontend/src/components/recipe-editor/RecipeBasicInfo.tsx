import { useRef } from "react";
import { Camera, Clock } from "lucide-react";

interface RecipeBasicInfoProps {
  name: string;
  setName: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  timeToMake: string;
  setTimeToMake: (val: string) => void;
  imagePreview: string | null;
  setImagePreview: (url: string | null) => void;
  setImageFile: (file: File | null) => void;
}

export function RecipeBasicInfo({
  name,
  setName,
  description,
  setDescription,
  timeToMake,
  setTimeToMake,
  imagePreview,
  setImagePreview,
  setImageFile,
}: RecipeBasicInfoProps) {
  // Referencja do ukrytego inputa
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Funkcja wywoływana po wybraniu pliku z galerii/dysku
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file); // Zapisujemy fizyczny plik do wysyłki (FormData)
      setImagePreview(URL.createObjectURL(file)); // Tworzymy tymczasowy URL do wyświetlenia podglądu
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Zdjęcie (teraz klikalne, wywołuje input) */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="w-full aspect-video bg-secondary/30 rounded-xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-2 overflow-hidden relative cursor-pointer hover:bg-secondary/50 active:scale-[0.98] transition-all"
      >
        {/* Ukryty input pliku */}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        {imagePreview ? (
          <img src={imagePreview} alt="Podgląd" className="w-full h-full object-cover" />
        ) : (
          <>
            <div className="bg-background p-3 rounded-full shadow-sm border border-border/50">
              <Camera className="text-muted-foreground" size={24} />
            </div>
            <span className="text-sm font-medium text-muted-foreground">Dodaj zdjęcie potrawy</span>
          </>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground/80 pl-1">Nazwa przepisu</label>
        <input
          type="text"
          placeholder="np. Spaghetti Bolognese"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-secondary/20 border border-border/50 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground/80 pl-1">Krótki opis</label>
        <textarea
          placeholder="Napisz coś o tym przepisie..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full bg-secondary/20 border border-border/50 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground/80 pl-1">
          Czas przygotowania (min)
        </label>
        <div className="relative">
          <Clock
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <input
            type="number"
            placeholder="np. 45"
            value={timeToMake}
            onChange={(e) => setTimeToMake(e.target.value)}
            className="w-full bg-secondary/20 border border-border/50 rounded-lg pl-10 pr-4 py-3 text-base focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>
    </div>
  );
}
