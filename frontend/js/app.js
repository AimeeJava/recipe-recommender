const ingredientsInput = document.getElementById("ingredientsInput");
const addIngredientBtn = document.getElementById("addIngredientBtn");
const ingredientTags = document.getElementById("ingredientTags");
const ingredientTagsStatus = document.getElementById("ingredientTagsStatus");
const excludeInput = document.getElementById("excludeInput");
const searchBtn = document.getElementById("searchBtn");
const clearBtn = document.getElementById("clearBtn");
const recipesContainer = document.getElementById("recipesContainer");
const messageBox = document.getElementById("messageBox");
const resultsSummary = document.getElementById("resultsSummary");
const resultsHeading = document.getElementById("resultsHeading");
const sortSelect = document.getElementById("sortSelect");
const dietSelect = document.getElementById("dietSelect");
const recipeSearchForm = document.getElementById("recipeSearchForm");

let selectedIngredients = [];

const recipeModalElement = document.getElementById("recipeModal");
const recipeModal = new bootstrap.Modal(recipeModalElement);
const recipeModalBody = document.getElementById("recipeModalBody");

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}

function normalizeRecipe(recipe = {}) {
  return {
    id: recipe.id ?? "unknown",
    title: recipe.title || "Untitled recipe",
    image: recipe.image || "",
    readyInMinutes:
      typeof recipe.readyInMinutes === "number" ? recipe.readyInMinutes : null,
    servings: typeof recipe.servings === "number" ? recipe.servings : null,
    usedIngredientCount:
      typeof recipe.usedIngredientCount === "number"
        ? recipe.usedIngredientCount
        : 0,
    missedIngredientCount:
      typeof recipe.missedIngredientCount === "number"
        ? recipe.missedIngredientCount
        : 0,
    aggregateLikes:
      typeof recipe.aggregateLikes === "number" ? recipe.aggregateLikes : 0,
    ingredients: Array.isArray(recipe.ingredients)
      ? recipe.ingredients.filter(Boolean)
      : [],
    instructions:
      typeof recipe.instructions === "string" && recipe.instructions.trim()
        ? recipe.instructions
        : "No instructions provided.",
  };
}

function formatCount(label, value, fallback) {
  return `${value ?? fallback} ${label}`;
}

function showMessage(type, text) {
  messageBox.className = `message-box ${type}`;
  messageBox.textContent = text;
  messageBox.setAttribute("role", type === "danger" ? "alert" : "status");
}

function hideMessage() {
  messageBox.className = "message-box hidden";
  messageBox.textContent = "";
  messageBox.setAttribute("role", "status");
}

function normalizeIngredient(value) {
  return value.trim().toLowerCase();
}

function addIngredientsFromInput() {
  const rawValue = ingredientsInput.value.trim();
  if (!rawValue) {
    showMessage("warning", "Enter at least one ingredient to add.");
    ingredientsInput.focus();
    return;
  }

  const items = rawValue.split(",").map(normalizeIngredient).filter(Boolean);
  let addedCount = 0;

  items.forEach((item) => {
    if (!selectedIngredients.includes(item)) {
      selectedIngredients.push(item);
      addedCount += 1;
    }
  });

  ingredientsInput.value = "";
  renderIngredientTags();
  hideMessage();

  if (addedCount === 0) {
    showMessage("warning", "Those ingredients were already added.");
  } else {
    showMessage(
      "success",
      `${addedCount} ingredient${addedCount === 1 ? "" : "s"} added.`,
    );
  }

  ingredientsInput.focus();
}

function removeIngredient(itemToRemove) {
  selectedIngredients = selectedIngredients.filter(
    (item) => item !== itemToRemove,
  );
  renderIngredientTags();
}

function renderIngredientTags() {
  ingredientTags.innerHTML = "";

  if (selectedIngredients.length === 0) {
    ingredientTags.innerHTML = `<span class="text-muted small">No ingredients added yet.</span>`;
    ingredientTagsStatus.textContent = "No ingredients added yet.";
    return;
  }

  ingredientTagsStatus.textContent = `${selectedIngredients.length} selected ingredient${
    selectedIngredients.length === 1 ? "" : "s"
  }.`;

  selectedIngredients.forEach((ingredient) => {
    const tag = document.createElement("span");
    tag.className = "ingredient-tag";
    tag.setAttribute("role", "listitem");
    tag.append(document.createTextNode(ingredient));

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", `Remove ${ingredient}`);
    removeButton.setAttribute("title", `Remove ${ingredient}`);
    removeButton.innerHTML = "&times;";

    removeButton.addEventListener("click", () => {
      removeIngredient(ingredient);
    });

    tag.append(removeButton);

    ingredientTags.appendChild(tag);
  });
}

function getSelectedDietFilters() {
  const filters = [];

  if (dietSelect.value) {
    filters.push(dietSelect.value);
  }

  document
    .querySelectorAll(".restriction-check:checked")
    .forEach((checkbox) => {
      filters.push(checkbox.value);
    });

  return filters;
}

function renderEmptyState() {
  recipesContainer.innerHTML = `
    <div class="empty-state">
      <i class="bi bi-search empty-icon" aria-hidden="true"></i>
      <h3>No recipes to display yet</h3>
      <p>Add ingredients and click <strong>Find Recipes</strong> to see recommendations.</p>
    </div>
  `;
  recipesContainer.setAttribute("aria-busy", "false");
}

function renderRecipes(recipes) {
  if (!recipes || recipes.length === 0) {
    recipesContainer.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-emoji-frown empty-icon" aria-hidden="true"></i>
        <h3>No matching recipes found</h3>
        <p>Try different ingredients or remove some restrictions.</p>
      </div>
    `;
    recipesContainer.setAttribute("aria-busy", "false");
    return;
  }

  recipesContainer.innerHTML = recipes
    .map((recipeData) => {
      const recipe = normalizeRecipe(recipeData);

      return `
      <article class="recipe-card" aria-labelledby="recipe-title-${recipe.id}">
        ${
          recipe.image
            ? `<img src="${escapeHtml(recipe.image)}" alt="${escapeHtml(recipe.title)}" class="recipe-image" />`
            : `<div class="recipe-image recipe-image-placeholder" aria-label="No image available for ${escapeHtml(recipe.title)}"></div>`
        }
        <div class="recipe-content">
          <h3 id="recipe-title-${recipe.id}">${escapeHtml(recipe.title)}</h3>

          <div class="recipe-meta">
            <span class="recipe-badge">
              <i class="bi bi-clock" aria-hidden="true"></i>${escapeHtml(formatCount("min", recipe.readyInMinutes, "N/A"))}
            </span>
            <span class="recipe-badge">
              <i class="bi bi-people" aria-hidden="true"></i>${escapeHtml(formatCount("servings", recipe.servings, "N/A"))}
            </span>
            <span class="recipe-badge">
              <i class="bi bi-check2-circle" aria-hidden="true"></i>${escapeHtml(formatCount("used", recipe.usedIngredientCount, 0))}
            </span>
          </div>

          <p class="recipe-note">Missing ingredients: ${escapeHtml(recipe.missedIngredientCount)}</p>

          <div class="card-actions">
            <button
              class="small-btn view-details-btn"
              data-id="${escapeHtml(recipe.id)}"
              type="button"
              aria-label="View details for ${escapeHtml(recipe.title)}"
            >
              View Details
            </button>
          </div>
        </div>
      </article>
    `;
    })
    .join("");

  recipesContainer.setAttribute("aria-busy", "false");

  document.querySelectorAll(".view-details-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const recipeId = button.dataset.id;
      const recipe = recipes.find((item) => String(item.id) === recipeId);
      if (recipe) {
        openRecipeModal(recipe);
      }
    });
  });
}

function openRecipeModal(recipe) {
  const safeRecipe = normalizeRecipe(recipe);

  recipeModalBody.innerHTML = `
    ${
      safeRecipe.image
        ? `<img src="${escapeHtml(safeRecipe.image)}" alt="${escapeHtml(safeRecipe.title)}" class="modal-image" />`
        : ""
    }
    <h3 class="modal-recipe-title">${escapeHtml(safeRecipe.title)}</h3>

    <div class="modal-stats">
      <div class="modal-stat-card">
        <div class="modal-stat-label">Ready In</div>
        <div class="modal-stat-value">${escapeHtml(formatCount("minutes", safeRecipe.readyInMinutes, "N/A"))}</div>
      </div>
      <div class="modal-stat-card">
        <div class="modal-stat-label">Servings</div>
        <div class="modal-stat-value">${escapeHtml(safeRecipe.servings ?? "N/A")}</div>
      </div>
      <div class="modal-stat-card">
        <div class="modal-stat-label">Likes</div>
        <div class="modal-stat-value">${escapeHtml(safeRecipe.aggregateLikes)}</div>
      </div>
    </div>

    <div class="modal-section">
      <h4 class="section-title">Ingredients</h4>
      <ul class="clean-list">
        ${
          safeRecipe.ingredients.length > 0
            ? safeRecipe.ingredients
                .map((item) => `<li>${escapeHtml(item)}</li>`)
                .join("")
            : "<li>No ingredients provided.</li>"
        }
      </ul>
    </div>

    <div class="modal-section">
      <h4 class="section-title">Instructions</h4>
      <p class="modal-text">${escapeHtml(safeRecipe.instructions)}</p>
    </div>
  `;

  recipeModal.show();
}

function sortRecipes(recipes, sortBy) {
  const copied = [...recipes];

  if (sortBy === "time") {
    copied.sort((a, b) => a.readyInMinutes - b.readyInMinutes);
  } else if (sortBy === "likes") {
    copied.sort((a, b) => b.aggregateLikes - a.aggregateLikes);
  }

  return copied;
}

async function fetchRecipes() {
  const diets = getSelectedDietFilters();
  const exclude = excludeInput.value.trim();

  const query = new URLSearchParams({
    ingredients: selectedIngredients.join(","),
    exclude,
    diets: diets.join(","),
    sort: sortSelect.value,
  });

  const response = await fetch(
    `/.netlify/functions/recommend?${query.toString()}`,
  );

  const rawBody = await response.text();
  let data = {};

  if (rawBody) {
    try {
      data = JSON.parse(rawBody);
    } catch (error) {
      console.log("Raw server response:", rawBody);
      throw new Error("Received an invalid server response.");
    }
  }

  if (!response.ok) {
    throw new Error(data.error || "Failed to fetch recipes.");
  }

  if (!Array.isArray(data.recipes)) {
    throw new Error("Recipe data is missing from the server response.");
  }

  return data.recipes;
}

async function handleSearch() {
  hideMessage();

  if (selectedIngredients.length === 0) {
    showMessage(
      "warning",
      "Please add at least one ingredient before searching.",
    );
    renderEmptyState();
    resultsSummary.textContent = "No search completed.";
    ingredientsInput.focus();
    return;
  }

  searchBtn.disabled = true;
  recipesContainer.setAttribute("aria-busy", "true");
  recipesContainer.innerHTML = `
    <div class="empty-state">
      <div class="spinner-border text-primary loading-spinner" aria-hidden="true"></div>
      <p class="sr-only" role="status" aria-live="polite">Searching for recipes.</p>
      <h3>Searching for recipes...</h3>
      <p>Please wait while we find recommendations for you.</p>
    </div>
  `;

  try {
    let recipes = await fetchRecipes();
    recipes = sortRecipes(recipes, sortSelect.value);

    renderRecipes(recipes);
    resultsSummary.textContent = `${recipes.length} recipe(s) found for: ${selectedIngredients.join(", ")}`;
    resultsHeading.focus();
  } catch (error) {
    console.error(error);
    showMessage(
      "danger",
      error.message ||
        "Unable to fetch recipes right now. Please try again later.",
    );
    renderEmptyState();
    resultsSummary.textContent = "Search failed.";
  } finally {
    searchBtn.disabled = false;
  }
}

function clearAll() {
  selectedIngredients = [];
  ingredientsInput.value = "";
  excludeInput.value = "";
  sortSelect.value = "default";
  dietSelect.value = "";

  document.querySelectorAll(".restriction-check").forEach((checkbox) => {
    checkbox.checked = false;
  });

  hideMessage();
  renderIngredientTags();
  renderEmptyState();
  resultsSummary.textContent = "No search yet.";
  ingredientsInput.focus();
}

addIngredientBtn.addEventListener("click", addIngredientsFromInput);

ingredientsInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addIngredientsFromInput();
  }
});

recipeSearchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleSearch();
});

clearBtn.addEventListener("click", clearAll);

renderIngredientTags();
renderEmptyState();

if (typeof module !== "undefined") {
  module.exports = {
    escapeHtml,
    normalizeRecipe,
    formatCount,
    addIngredientsFromInput,
    renderIngredientTags,
    renderRecipes,
    openRecipeModal,
    fetchRecipes,
    handleSearch,
    clearAll,
    showMessage,
    hideMessage,
  };
}
