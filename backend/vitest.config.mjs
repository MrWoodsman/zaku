import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      // Interesuje nas tylko kod, ktory realnie piszemy - nie liczymy uploadow,
      // danych ani wlasnych plikow testowych do puli "co jest pokryte testami".
      include: ["routes/**", "app.js", "db.js"],
      exclude: ["**/*.test.js"],
      reporter: ["text"],
    },
  },
});
