const MAX_CHARS = 200;
const WARN_CHARS = 180;
const DRAFT_KEY = "draft";
const THEME_KEY = "theme";

// Select all the elements
const textarea = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");

// Update both counters and the warning classes
function updateCounts() {
  const text = textarea.value;
  const chars = text.length;
  const trimmed = text.trim();
  const words = trimmed === "" ? 0 : trimmed.split(/\s+/).length;

  charCount.textContent = `${chars} / ${MAX_CHARS} characters`;
  wordCount.textContent = `${words} words`;

  charCount.classList.toggle("over", chars > MAX_CHARS);
  charCount.classList.toggle("warning", chars > WARN_CHARS && chars <= MAX_CHARS);
}

// Empty the textarea, reset the counters and remove the saved draft
function clearAll() {
  textarea.value = "";
  localStorage.removeItem(DRAFT_KEY);
  updateCounts();
}

// Show the right label for the current theme
function updateThemeLabel() {
  const isDark = document.body.classList.contains("dark");
  themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
}

// Every keystroke: update counters and save the draft
textarea.addEventListener("input", function () {
  updateCounts();
  localStorage.setItem(DRAFT_KEY, textarea.value);
});

// Escape inside the textarea clears everything
textarea.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    clearAll();
  }
});

clearBtn.addEventListener("click", clearAll);

// Toggle dark mode and remember the choice
themeToggle.addEventListener("click", function () {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  updateThemeLabel();
});

// On page load: restore the draft and the theme, then update the counters
const savedDraft = localStorage.getItem(DRAFT_KEY);
if (savedDraft !== null) {
  textarea.value = savedDraft;
}

if (localStorage.getItem(THEME_KEY) === "dark") {
  document.body.classList.add("dark");
}
updateThemeLabel();
updateCounts();