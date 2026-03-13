const recommendModulePath = require.resolve("../netlify/functions/recommend.js");

describe("recommend function helpers", () => {
  let recommend;

  beforeEach(() => {
    process.env.SPOONACULAR_API_KEY = "test-key";
    jest.resetModules();
    recommend = require(recommendModulePath);
  });

  test("parseList ignores invalid input and trims values", () => {
    expect(recommend.parseList(null)).toEqual([]);
    expect(recommend.parseList(" tomato, pasta , , basil ")).toEqual([
      "tomato",
      "pasta",
      "basil",
    ]);
  });

  test("normalizeQueryParams clamps sort and list sizes", () => {
    const longIngredients = Array.from({ length: 25 }, (_, index) => `item${index}`)
      .join(",");

    const result = recommend.normalizeQueryParams({
      ingredients: longIngredients,
      exclude: "milk, eggs",
      diets: "vegan,gluten",
      sort: "unknown",
    });

    expect(result.ingredients).toHaveLength(20);
    expect(result.exclude).toEqual(["milk", "eggs"]);
    expect(result.filters).toEqual(["vegan", "gluten"]);
    expect(result.sort).toBe("default");
  });

  test("normalizeRecipe provides fallbacks for missing data", () => {
    expect(recommend.normalizeRecipe({})).toEqual({
      id: null,
      title: "Untitled recipe",
      image: "",
      usedIngredientCount: 0,
      missedIngredientCount: 0,
      readyInMinutes: null,
      servings: null,
      aggregateLikes: 0,
      ingredients: [],
      instructions: "No instructions provided.",
    });
  });
});

describe("recommend handler", () => {
  beforeEach(() => {
    process.env.SPOONACULAR_API_KEY = "test-key";
    jest.resetModules();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  test("returns 405 for unsupported methods", async () => {
    const recommend = require(recommendModulePath);
    const response = await recommend.handler({
      httpMethod: "POST",
      queryStringParameters: {},
    });

    expect(response.statusCode).toBe(405);
    expect(JSON.parse(response.body)).toEqual({
      error: "Method POST is not allowed.",
    });
  });

  test("returns 400 when ingredients are missing", async () => {
    const recommend = require(recommendModulePath);
    const response = await recommend.handler({
      httpMethod: "GET",
      queryStringParameters: {},
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toMatch(/at least one ingredient/i);
  });

  test("returns formatted recipes when Spoonacular succeeds", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          results: [
            {
              id: 7,
              title: "Pasta",
              image: "image.jpg",
              extendedIngredients: [{ original: "1 cup pasta" }],
            },
          ],
        }),
      ),
    });

    const recommend = require(recommendModulePath);
    const response = await recommend.handler({
      httpMethod: "GET",
      queryStringParameters: { ingredients: "pasta", sort: "likes" },
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toContain("sort=popularity");
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).recipes[0]).toMatchObject({
      id: 7,
      title: "Pasta",
      ingredients: ["1 cup pasta"],
    });
  });

  test("returns 500 when upstream response is invalid JSON", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue("{"),
    });

    const recommend = require(recommendModulePath);
    const response = await recommend.handler({
      httpMethod: "GET",
      queryStringParameters: { ingredients: "pasta" },
    });

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).error).toMatch(/server error/i);
  });
});
