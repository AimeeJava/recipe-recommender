const path = require("path");

function createElement(tagName, ownerDocument) {
  const element = {
    tagName: tagName.toUpperCase(),
    ownerDocument,
    children: [],
    listeners: {},
    attributes: {},
    dataset: {},
    style: {},
    value: "",
    disabled: false,
    focused: false,
    textContent: "",
    className: "",
    append(child) {
      if (typeof child === "string") {
        this.textContent += child;
        return;
      }

      this.children.push(child);
      child.parentNode = this;
    },
    appendChild(child) {
      this.children.push(child);
      child.parentNode = this;
      return child;
    },
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    dispatchEvent(event) {
      const handler = this.listeners[event.type];
      if (handler) {
        handler(event);
      }
    },
    focus() {
      this.focused = true;
      ownerDocument.activeElement = this;
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name === "id") {
        this.id = String(value);
        ownerDocument.elementsById[this.id] = this;
      }
      if (name.startsWith("data-")) {
        const key = name
          .slice(5)
          .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        this.dataset[key] = String(value);
      }
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    querySelector(selector) {
      if (selector === "button") {
        return this.children.find((child) => child.tagName === "BUTTON") || null;
      }

      return null;
    },
  };

  Object.defineProperty(element, "innerHTML", {
    get() {
      return this._innerHTML || "";
    },
    set(value) {
      this._innerHTML = String(value);
      this.children = [];
    },
  });

  return element;
}

function buildDom() {
  const document = {
    elementsById: {},
    activeElement: null,
    createElement(tagName) {
      return createElement(tagName, document);
    },
    createTextNode(text) {
      return String(text);
    },
    getElementById(id) {
      return document.elementsById[id] || null;
    },
    querySelectorAll(selector) {
      if (selector === ".restriction-check:checked") {
        return Object.values(document.elementsById).filter(
          (element) =>
            element.className.includes("restriction-check") && element.checked,
        );
      }

      if (selector === ".restriction-check") {
        return Object.values(document.elementsById).filter((element) =>
          element.className.includes("restriction-check"),
        );
      }

      if (selector === ".view-details-btn") {
        return Object.values(document.elementsById).filter((element) =>
          element.className.includes("view-details-btn"),
        );
      }

      return [];
    },
  };

  const ids = [
    "ingredientsInput",
    "addIngredientBtn",
    "ingredientTags",
    "ingredientTagsStatus",
    "excludeInput",
    "searchBtn",
    "clearBtn",
    "recipesContainer",
    "messageBox",
    "resultsSummary",
    "resultsHeading",
    "sortSelect",
    "dietSelect",
    "recipeSearchForm",
    "recipeModal",
    "recipeModalBody",
  ];

  ids.forEach((id) => {
    const tagName = id === "recipeSearchForm" ? "form" : "div";
    const element = createElement(tagName, document);
    element.setAttribute("id", id);

    if (id === "ingredientsInput" || id === "excludeInput") {
      element.value = "";
    }

    if (id === "sortSelect") {
      element.value = "default";
    }

    if (id === "dietSelect") {
      element.value = "";
    }

    document.elementsById[id] = element;
  });

  const glutenFree = createElement("input", document);
  glutenFree.setAttribute("id", "glutenFree");
  glutenFree.className = "restriction-check";
  glutenFree.value = "gluten";
  glutenFree.checked = false;
  document.elementsById.glutenFree = glutenFree;

  const dairyFree = createElement("input", document);
  dairyFree.setAttribute("id", "dairyFree");
  dairyFree.className = "restriction-check";
  dairyFree.value = "dairy";
  dairyFree.checked = false;
  document.elementsById.dairyFree = dairyFree;

  return document;
}

describe("frontend app behavior", () => {
  let app;
  let document;
  let modalShow;

  beforeEach(() => {
    jest.resetModules();
    document = buildDom();
    modalShow = jest.fn();
    global.document = document;
    global.window = { document };
    global.bootstrap = {
      Modal: jest.fn(() => ({
        show: modalShow,
      })),
    };
    global.fetch = jest.fn();

    app = require(path.resolve(__dirname, "../../frontend/js/app.js"));
  });

  afterEach(() => {
    delete global.document;
    delete global.window;
    delete global.bootstrap;
    delete global.fetch;
  });

  test("addIngredientsFromInput reports invalid input and keeps focus", () => {
    const ingredientsInput = document.getElementById("ingredientsInput");
    const messageBox = document.getElementById("messageBox");

    ingredientsInput.value = "   ";
    app.addIngredientsFromInput();

    expect(messageBox.textContent).toMatch(/enter at least one ingredient/i);
    expect(document.activeElement).toBe(ingredientsInput);
  });

  test("renderRecipes shows fallback content for missing fields", () => {
    const recipesContainer = document.getElementById("recipesContainer");

    app.renderRecipes([{ id: 1 }]);

    expect(recipesContainer.innerHTML).toContain("Untitled recipe");
    expect(recipesContainer.innerHTML).toContain("No image available");
    expect(recipesContainer.getAttribute("aria-busy")).toBe("false");
  });

  test("fetchRecipes throws when server response omits recipes", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue("{}"),
    });

    document.getElementById("ingredientsInput").value = "pasta";
    app.addIngredientsFromInput();

    await expect(app.fetchRecipes()).rejects.toThrow(/recipe data is missing/i);
  });

  test("openRecipeModal renders fallbacks and opens the modal", () => {
    const recipeModalBody = document.getElementById("recipeModalBody");

    app.openRecipeModal({});

    expect(recipeModalBody.innerHTML).toContain("Untitled recipe");
    expect(recipeModalBody.innerHTML).toContain("No ingredients provided.");
    expect(modalShow).toHaveBeenCalled();
  });
});
