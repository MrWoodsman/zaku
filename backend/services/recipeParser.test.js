import { describe, it, expect } from "vitest";
import { extractRecipeFromHtml, parseIngredient, parseDuration, parseServings } from "./recipeParser.js";
import { isPrivateIp } from "./safeFetch.js";

describe("parseIngredient", () => {
  it("splits quantity, a supported unit and name", () => {
    expect(parseIngredient("500 g mąki")).toEqual({ name: "mąki", quantity: 500, unit: "g" });
    expect(parseIngredient("1,5 l mleka")).toEqual({ name: "mleka", quantity: 1.5, unit: "l" });
    expect(parseIngredient("2 szt. jajek")).toEqual({ name: "jajek", quantity: 2, unit: "szt." });
    expect(parseIngredient("5 dag sera")).toEqual({ name: "sera", quantity: 50, unit: "g" });
  });

  it("keeps units the app does not know in the name", () => {
    expect(parseIngredient("2 łyżki oliwy")).toEqual({ name: "łyżki oliwy", quantity: 2, unit: "" });
  });

  it("does not mistake a word starting with a unit letter for the unit", () => {
    expect(parseIngredient("1 liść laurowy")).toEqual({ name: "liść laurowy", quantity: 1, unit: "" });
  });

  it("reads the name-first layout used by aniagotuje.pl", () => {
    expect(parseIngredient("jajka 2 sztuki")).toEqual({ name: "jajka", quantity: 2, unit: "szt." });
    expect(parseIngredient("kiełbasa - najlepiej lekko podwędzana 80 g")).toEqual({
      name: "kiełbasa - najlepiej lekko podwędzana",
      quantity: 80,
      unit: "g",
    });
    expect(parseIngredient("olej roślinny 2 łyżki")).toEqual({ name: "olej roślinny (łyżki)", quantity: 2, unit: "" });
    expect(parseIngredient("cebula 100 g - 1 mała sztuka")).toEqual({
      name: "cebula (1 mała sztuka)",
      quantity: 100,
      unit: "g",
    });
    expect(parseIngredient("sól - można pominąć drobina do smaku").quantity).toBe(0);
  });

  it("handles fractions and lines without a number", () => {
    expect(parseIngredient("½ szklanki cukru")).toEqual({ name: "szklanki cukru", quantity: 0.5, unit: "" });
    expect(parseIngredient("sól do smaku")).toEqual({ name: "sól do smaku", quantity: 0, unit: "" });
  });
});

describe("parseDuration / parseServings", () => {
  it("reads ISO 8601 durations as minutes", () => {
    expect(parseDuration("PT0H30M")).toBe(30);
    expect(parseDuration("PT1H15M")).toBe(75);
    expect(parseDuration("nonsense")).toBe(0);
  });

  it("takes the first whole number as servings", () => {
    expect(parseServings("1-2 porcje")).toBe(1);
    expect(parseServings(["4", "4 servings"])).toBe(4);
    expect(parseServings("kilka")).toBeNull();
    expect(parseServings(500)).toBeNull();
  });
});

describe("extractRecipeFromHtml", () => {
  it("reads a JSON-LD recipe inside @graph", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      "@graph": [
        { "@type": "WebPage" },
        {
          "@type": "Recipe",
          name: "Naleśniki",
          recipeYield: "4",
          totalTime: "PT45M",
          recipeIngredient: ["250 g mąki", "2 jajka"],
          recipeInstructions: [{ "@type": "HowToStep", text: "Wymieszaj." }, "Smaż."],
        },
      ],
    })}</script>`;

    const recipe = extractRecipeFromHtml(html);
    expect(recipe.name).toBe("Naleśniki");
    expect(recipe.servings).toBe(4);
    expect(recipe.time_to_make).toBe(45);
    expect(recipe.ingredients[0]).toEqual({ name: "mąki", quantity: 250, unit: "g" });
    expect(recipe.steps.map((s) => s.description)).toEqual(["Wymieszaj.", "Smaż."]);
  });

  it("reads a microdata recipe (the aniagotuje.pl style)", () => {
    const html = `
      <div itemscope itemtype="https://schema.org/Recipe">
        <div itemprop="author" itemscope itemtype="https://schema.org/Person">
          <meta itemprop="name" content="Ania Gotuje">
        </div>
        <h1 itemprop="name">Szakszuka</h1>
        <meta itemprop="recipeYield" content="1-2 porcje">
        <meta itemprop="totalTime" content="PT0H30M">
        <span itemprop="recipeIngredient">3 jajka</span>
        <span itemprop="recipeIngredient">200 g kiełbasy</span>
        <div itemprop="recipeInstructions" itemscope itemtype="https://schema.org/HowToStep">
          <span itemprop="name">Podsmaż cebulę</span>
          <div itemprop="text">Cebulę podsmaż na oleju.</div>
        </div>
      </div>`;

    const recipe = extractRecipeFromHtml(html);
    expect(recipe.name).toBe("Szakszuka");
    expect(recipe.servings).toBe(1);
    expect(recipe.time_to_make).toBe(30);
    expect(recipe.ingredients).toHaveLength(2);
    expect(recipe.steps[0]).toEqual({ title: "Podsmaż cebulę", description: "Cebulę podsmaż na oleju.", order: 1 });
  });

  it("returns null when the page has no recipe", () => {
    expect(extractRecipeFromHtml("<html><body>nic tu nie ma</body></html>")).toBeNull();
  });
});

describe("isPrivateIp", () => {
  it("blocks local and private addresses only", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("192.168.1.10")).toBe(true);
    expect(isPrivateIp("10.0.0.5")).toBe(true);
    expect(isPrivateIp("::1")).toBe(true);
    expect(isPrivateIp("93.184.216.34")).toBe(false);
  });
});
