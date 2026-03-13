const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;
const ALLOWED_METHODS = new Set(["GET", "OPTIONS"]);
const ALLOWED_SORTS = new Set(["default", "time", "likes"]);

function buildHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: buildHeaders(),
    body: JSON.stringify(body),
  };
}

function parseList(value) {
  if (!value || typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getDietAndIntolerances(filters) {
  let diet = "";
  const intolerances = [];

  filters.forEach((filter) => {
    const value = filter.toLowerCase();

    if ((value === "vegetarian" || value === "vegan") && !diet) {
      diet = value;
    }

    if (value === "gluten") {
      intolerances.push("gluten");
    }

    if (value === "dairy") {
      intolerances.push("dairy");
    }
  });

  return { diet, intolerances };
}

function mapSort(sort) {
  if (sort === "time") return "time";
  if (sort === "likes") return "popularity";
  return "";
}

function normalizeQueryParams(params = {}) {
  const ingredients = parseList(params.ingredients).slice(0, 20);
  const exclude = parseList(params.exclude).slice(0, 20);
  const filters = parseList(params.diets);
  const sort = ALLOWED_SORTS.has(params.sort) ? params.sort : "default";

  return { ingredients, exclude, filters, sort };
}

function normalizeRecipe(recipe = {}) {
  return {
    id: recipe.id ?? null,
    title: recipe.title || "Untitled recipe",
    image: recipe.image || "",
    usedIngredientCount: recipe.usedIngredientCount ?? 0,
    missedIngredientCount: recipe.missedIngredientCount ?? 0,
    readyInMinutes: recipe.readyInMinutes ?? null,
    servings: recipe.servings ?? null,
    aggregateLikes: recipe.aggregateLikes ?? 0,
    ingredients: (recipe.extendedIngredients || [])
      .map((item) => item?.original)
      .filter(Boolean),
    instructions: recipe.instructions || "No instructions provided.",
  };
}

function formatComplexSearch(recipes) {
  if (!Array.isArray(recipes)) {
    return [];
  }

  return recipes.map(normalizeRecipe);
}

exports.handler = async (event) => {
  if (!ALLOWED_METHODS.has(event.httpMethod)) {
    return jsonResponse(405, {
      error: `Method ${event.httpMethod} is not allowed.`,
    });
  }

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: buildHeaders(),
      body: "",
    };
  }

  if (!SPOONACULAR_API_KEY) {
    return jsonResponse(500, {
      error: "Missing SPOONACULAR_API_KEY in environment variables.",
    });
  }

  try {
    const params = event.queryStringParameters || {};
    const { ingredients, exclude, filters, sort } =
      normalizeQueryParams(params);

    if (ingredients.length === 0) {
      return jsonResponse(400, {
        error: "Please provide at least one ingredient.",
      });
    }

    const { diet, intolerances } = getDietAndIntolerances(filters);

    const searchParams = new URLSearchParams({
      apiKey: SPOONACULAR_API_KEY,
      includeIngredients: ingredients.join(","),
      number: "12",
      addRecipeInformation: "true",
      fillIngredients: "true",
      instructionsRequired: "true",
    });

    if (diet) {
      searchParams.set("diet", diet);
    }

    if (intolerances.length > 0) {
      searchParams.set("intolerances", intolerances.join(","));
    }

    if (exclude.length > 0) {
      searchParams.set("excludeIngredients", exclude.join(","));
    }

    const spoonSort = mapSort(sort);
    if (spoonSort) {
      searchParams.set("sort", spoonSort);
    }

    const url = `https://api.spoonacular.com/recipes/complexSearch?${searchParams.toString()}`;
    const response = await fetch(url);
    const rawBody = await response.text();
    const data = rawBody ? JSON.parse(rawBody) : {};

    if (!response.ok) {
      return jsonResponse(response.status, {
        error: "Failed to fetch data from Spoonacular.",
        details: data,
      });
    }

    return jsonResponse(200, {
      recipes: formatComplexSearch(data.results || []),
    });
  } catch (error) {
    return jsonResponse(500, {
      error: "Server error while fetching recipes.",
      details: error.message,
    });
  }
};

module.exports = {
  buildHeaders,
  jsonResponse,
  parseList,
  getDietAndIntolerances,
  mapSort,
  normalizeQueryParams,
  normalizeRecipe,
  formatComplexSearch,
  handler: exports.handler,
};
