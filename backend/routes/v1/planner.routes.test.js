import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { initDB } from "../../db.js";

let app;
let db;

beforeEach(async () => {
  process.env.DB_PATH = ":memory:";
  db = await initDB();
  app = createApp(db);
});

afterEach(async () => {
  await db.close();
});

const api = (method, path, group = "g1") => request(app)[method](`/api/v1/planner${path}`).set("x-group-id", group);

const addPerson = async (name = "Mikołaj", color = "#f97316", group = "g1") =>
  (await api("post", "/people", group).send({ name, color })).body;

// The group row is created by the app on the first request, so make sure it exists first
const addRecipe = async (id, name, ingredients, group = "g1") => {
  await db.run(`INSERT OR IGNORE INTO groups (id, name) VALUES (?, ?)`, [group, group]);
  await db.run(`INSERT INTO recipes (id, group_id, name, status) VALUES (?, ?, ?, 'published')`, [id, group, name]);
  for (const [ingName, quantity, unit] of ingredients) {
    await db.run(`INSERT INTO ingredients (recipe_id, name, quantity, unit) VALUES (?, ?, ?, ?)`, [
      id,
      ingName,
      quantity,
      unit,
    ]);
  }
};

describe("x-group-id header is required", () => {
  it.each([
    { method: "get", path: "/people" },
    { method: "post", path: "/people" },
    { method: "put", path: "/people/x" },
    { method: "delete", path: "/people/x" },
    { method: "get", path: "/meals?from=2026-10-26&to=2026-11-01" },
    { method: "post", path: "/meals" },
    { method: "delete", path: "/meals/x" },
    { method: "get", path: "/ingredients?from=2026-10-26&to=2026-11-01" },
  ])("$method $path -> 401 without x-group-id", async ({ method, path }) => {
    const res = await request(app)[method](`/api/v1/planner${path}`).send({});

    expect(res.status).toBe(401);
  });
});

describe("people", () => {
  it("creates, lists (per group), renames and deletes", async () => {
    const person = await addPerson("Mikołaj", "#f97316");
    expect(person).toMatchObject({ name: "Mikołaj", color: "#f97316" });

    await addPerson("Ola", "#3b82f6");
    await addPerson("Obcy", "#22c55e", "g2");

    const list = await api("get", "/people");
    expect(list.body.map((p) => p.name)).toEqual(["Mikołaj", "Ola"]);

    const renamed = await api("put", `/people/${person.id}`).send({ name: "Miki", color: "#ef4444" });
    expect(renamed.status).toBe(200);
    expect((await api("get", "/people")).body[0]).toMatchObject({ name: "Miki", color: "#ef4444" });

    expect((await api("delete", `/people/${person.id}`)).status).toBe(200);
    expect((await api("get", "/people")).body).toHaveLength(1);
  });

  it("defaults to breakfast / lunch / dinner and keeps the chosen slots in day order", async () => {
    const plain = await addPerson("Ola", "#3b82f6");
    expect(plain.slots).toEqual(["breakfast", "lunch", "dinner"]);

    const custom = (await api("post", "/people").send({ name: "Miki", color: "#f97316", slots: ["snack", "breakfast"] }))
      .body;
    expect(custom.slots).toEqual(["breakfast", "snack"]);

    const list = (await api("get", "/people")).body;
    expect(list.find((p) => p.name === "Miki").slots).toEqual(["breakfast", "snack"]);
  });

  it("updates slots only when they are sent", async () => {
    const person = (await api("post", "/people").send({ name: "Miki", color: "#f97316", slots: ["lunch"] })).body;

    await api("put", `/people/${person.id}`).send({ name: "Miki", color: "#ef4444" });
    expect((await api("get", "/people")).body[0].slots).toEqual(["lunch"]);

    const res = await api("put", `/people/${person.id}`).send({
      name: "Miki",
      color: "#ef4444",
      slots: ["second_breakfast", "dinner"],
    });
    expect(res.body.slots).toEqual(["second_breakfast", "dinner"]);
  });

  it("rejects empty or unknown slots", async () => {
    const post = (slots) => api("post", "/people").send({ name: "Ola", color: "#3b82f6", slots });

    expect((await post([])).status).toBe(400);
    expect((await post(["brunch"])).status).toBe(400);
    expect((await post("lunch")).status).toBe(400);
  });

  it("rejects an empty name and a bad color", async () => {
    expect((await api("post", "/people").send({ name: "  ", color: "#f97316" })).status).toBe(400);
    expect((await api("post", "/people").send({ name: "Ola", color: "orange" })).status).toBe(400);
  });

  it("can't touch another group's person", async () => {
    const person = await addPerson();

    const put = await api("put", `/people/${person.id}`, "g2").send({ name: "X", color: "#f97316" });
    const del = await api("delete", `/people/${person.id}`, "g2");

    expect(put.status).toBe(404);
    expect(del.status).toBe(404);
  });

  it("deleting a person keeps their meals as shared", async () => {
    const person = await addPerson();
    await api("post", "/meals").send({
      date: "2026-10-26",
      slot: "lunch",
      title: "Pizza",
      person_id: person.id,
    });

    await api("delete", `/people/${person.id}`);

    const meals = await api("get", "/meals?from=2026-10-26&to=2026-10-26");
    expect(meals.body).toHaveLength(1);
    expect(meals.body[0].person_id).toBeNull();
  });
});

describe("meals", () => {
  it("adds a note meal and a recipe meal (title falls back to the recipe name)", async () => {
    await api("get", "/people"); // creates the group
    await addRecipe("r1", "Naleśniki", []);

    const note = await api("post", "/meals").send({ date: "2026-10-26", slot: "dinner", title: "Pizza na mieście" });
    const fromRecipe = await api("post", "/meals").send({ date: "2026-10-26", slot: "breakfast", recipe_id: "r1" });

    expect(note.status).toBe(201);
    expect(fromRecipe.status).toBe(201);

    const meals = await api("get", "/meals?from=2026-10-26&to=2026-10-26");
    expect(meals.body.map((m) => m.title).sort()).toEqual(["Naleśniki", "Pizza na mieście"]);
    expect(meals.body.find((m) => m.title === "Naleśniki").recipe_id).toBe("r1");
  });

  it("returns only meals from the requested range and group", async () => {
    await api("post", "/meals").send({ date: "2026-10-25", slot: "lunch", title: "Przed" });
    await api("post", "/meals").send({ date: "2026-10-27", slot: "lunch", title: "W środku" });
    await api("post", "/meals").send({ date: "2026-11-02", slot: "lunch", title: "Po" });
    await api("post", "/meals", "g2").send({ date: "2026-10-27", slot: "lunch", title: "Cudze" });

    const res = await api("get", "/meals?from=2026-10-26&to=2026-11-01");

    expect(res.body.map((m) => m.title)).toEqual(["W środku"]);
  });

  it("validates date, slot, title, person and recipe", async () => {
    const post = (body) => api("post", "/meals").send(body);

    expect((await post({ date: "jutro", slot: "lunch", title: "X" })).status).toBe(400);
    expect((await post({ date: "2026-10-26", slot: "brunch", title: "X" })).status).toBe(400);
    expect((await post({ date: "2026-10-26", slot: "snack", title: "Jabłko" })).status).toBe(201);
    expect((await post({ date: "2026-10-26", slot: "second_breakfast", title: "Jogurt" })).status).toBe(201);
    expect((await post({ date: "2026-10-26", slot: "lunch" })).status).toBe(400);
    expect((await post({ date: "2026-10-26", slot: "lunch", title: "X", person_id: "nope" })).status).toBe(404);
    expect((await post({ date: "2026-10-26", slot: "lunch", recipe_id: "nope" })).status).toBe(404);
    expect((await api("get", "/meals?from=a&to=b")).status).toBe(400);
  });

  it("deletes a meal, only in its own group", async () => {
    const { body } = await api("post", "/meals").send({ date: "2026-10-26", slot: "lunch", title: "Zupa" });

    expect((await api("delete", `/meals/${body.id}`, "g2")).status).toBe(404);
    expect((await api("delete", `/meals/${body.id}`)).status).toBe(200);
    expect((await api("get", "/meals?from=2026-10-26&to=2026-10-26")).body).toEqual([]);
  });

  it("a meal outlives its deleted recipe", async () => {
    await api("get", "/people");
    await addRecipe("r1", "Naleśniki", []);
    await api("post", "/meals").send({ date: "2026-10-26", slot: "lunch", recipe_id: "r1" });

    await db.run(`DELETE FROM recipes WHERE id = 'r1'`);

    const meals = await api("get", "/meals?from=2026-10-26&to=2026-10-26");
    expect(meals.body[0]).toMatchObject({ title: "Naleśniki", recipe_id: null });
  });
});

describe("GET /ingredients", () => {
  it("sums ingredients of planned recipes by name + unit", async () => {
    await api("get", "/people");
    await addRecipe("r1", "Naleśniki", [["Mąka", 200, "g"], ["Jajka", 2, "szt"]]);
    await addRecipe("r2", "Placki", [["mąka", 300, "g"], ["Mleko", 1, "l"]]);

    await api("post", "/meals").send({ date: "2026-10-26", slot: "breakfast", recipe_id: "r1" });
    await api("post", "/meals").send({ date: "2026-10-27", slot: "breakfast", recipe_id: "r1" });
    await api("post", "/meals").send({ date: "2026-10-28", slot: "dinner", recipe_id: "r2" });
    await api("post", "/meals").send({ date: "2026-10-28", slot: "lunch", title: "Notatka bez przepisu" });
    await api("post", "/meals").send({ date: "2026-11-05", slot: "lunch", recipe_id: "r2" }); // outside range

    const res = await api("get", "/ingredients?from=2026-10-26&to=2026-11-01");

    expect(res.status).toBe(200);
    // "Mąka" / "mąka" collapse into one row; SQLite sorts "ą" after plain ASCII, so Mleko comes first
    expect(res.body).toEqual([
      { name: "Jajka", unit: "szt", quantity: 4 },
      { name: "Mleko", unit: "l", quantity: 1 },
      { name: "Mąka", unit: "g", quantity: 700 },
    ]);
  });

  it("person_id narrows to that person's meals plus the shared ones", async () => {
    await addRecipe("r1", "Naleśniki", [["Mąka", 200, "g"]]);
    await addRecipe("r2", "Placki", [["Mleko", 1, "l"]]);
    await addRecipe("r3", "Zupa", [["Marchew", 3, "szt"]]);
    const ola = await addPerson("Ola", "#3b82f6");
    const miki = await addPerson("Miki", "#f97316");

    const day = { date: "2026-10-26", slot: "lunch" };
    await api("post", "/meals").send({ ...day, recipe_id: "r1", person_id: ola.id });
    await api("post", "/meals").send({ ...day, recipe_id: "r2", person_id: miki.id });
    await api("post", "/meals").send({ ...day, recipe_id: "r3" }); // shared

    const res = await api("get", `/ingredients?from=2026-10-26&to=2026-11-01&person_id=${ola.id}`);

    expect(res.body.map((i) => i.name)).toEqual(["Marchew", "Mąka"]);
  });
});
