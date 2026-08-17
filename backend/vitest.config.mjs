import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      // Interesuje nas tylko kod, ktory realnie piszemy - nie liczymy uploadow,
      // danych ani wlasnych plikow testowych do puli "co jest pokryte testami".
      include: ["routes/**", "app.js", "db.js"],
      exclude: ["**/*.test.js"],
      // "lcov" generuje plik, ktory rozumie rozszerzenie Coverage Gutters w VS Code -
      // dzieki temu widac wprost w edytorze, ktore linie sa pokryte testami, bez recznych komentarzy.
      reporter: ["text", "lcov"],
    },
  },
});
