// Starting data
let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

const VALID_CATEGORIES = ["personal", "work", "study"];

// Lower-case, trim and collapse repeated spaces so comparisons ignore case and extra spaces
function normalize(text) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

// 1. Returns notes whose text contains the word, ignoring case
function searchNotes(word) {
  const search = word.toLowerCase();
  return notes.filter((note) => note.text.toLowerCase().includes(search));
}

// 2. Returns the note with the most characters, or null if there are no notes
function longestNote() {
  if (notes.length === 0) {
    return null;
  }
  let longest = notes[0];
  for (const note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }
  return longest;
}

// 3. Returns an object counting notes per category
function countByCategory() {
  const counts = {};
  for (const note of notes) {
    if (counts[note.category]) {
      counts[note.category]++;
    } else {
      counts[note.category] = 1;
    }
  }
  return counts;
}

// 4. Returns a sentence such as "5 notes: 2 personal, 2 study, 1 work."
function getSummary() {
  const total = notes.length;
  if (total === 0) {
    return "0 notes.";
  }
  const counts = countByCategory();
  const parts = [];
  for (const category in counts) {
    parts.push(`${counts[category]} ${category}`);
  }
  const word = total === 1 ? "note" : "notes";
  return `${total} ${word}: ${parts.join(", ")}.`;
}

// 5. Returns true if a note with the same text already exists
function isDuplicate(text) {
  const target = normalize(text);
  return notes.some((note) => normalize(note.text) === target);
}

// 6. Adds a note only if it passes every check; returns true or false
function addNote(text, category) {
  const cleaned = text.trim();

  if (cleaned.length < 1 || cleaned.length > 200) {
    console.log("Rejected: text must be 1-200 characters.");
    return false;
  }
  if (isDuplicate(cleaned)) {
    console.log("Rejected: duplicate note.");
    return false;
  }
  if (!VALID_CATEGORIES.includes(category)) {
    console.log("Rejected: category must be personal, work or study.");
    return false;
  }

  const nextId = notes.length > 0 ? Math.max(...notes.map((n) => n.id)) + 1 : 1;
  notes.push({ id: nextId, text: cleaned, category: category });
  console.log(`Added note #${nextId}.`);
  return true;
}

// ---------------- Tests ----------------

// searchNotes
console.log(searchNotes("the"));
// [ { id: 2, text: "Finish the Day 3 assignment", category: "study" },
//   { id: 3, text: "Email the project report to Grace", category: "work" } ]
console.log(searchNotes("JAVASCRIPT"));
// [ { id: 4, text: "Revise JavaScript arrays", category: "study" } ]  (case ignored)
console.log(searchNotes("zebra"));
// []  (no results)

// longestNote
console.log(longestNote());
// { id: 3, text: "Email the project report to Grace", category: "work" }  (33 characters)
const savedNotes = notes;
notes = [];
console.log(longestNote());
// null  (no notes)
notes = savedNotes;

// countByCategory
console.log(countByCategory());
// { personal: 2, study: 2, work: 1 }
notes = [];
console.log(countByCategory());
// {}  (no notes)
notes = savedNotes;

// getSummary
console.log(getSummary());
// "5 notes: 2 personal, 2 study, 1 work."
notes = [{ id: 1, text: "Only note", category: "work" }];
console.log(getSummary());
// "1 note: 1 work."  (singular)
notes = [];
console.log(getSummary());
// "0 notes."  (no notes)
notes = savedNotes;

// isDuplicate
console.log(isDuplicate("buy milk and bread"));
// true  (case ignored)
console.log(isDuplicate("  CALL   MUM  "));
// true  (extra spaces ignored)
console.log(isDuplicate("Water the plants"));
// false

// addNote
console.log(addNote("Water the plants", "personal"));
// Added note #6.
// true
console.log(addNote("water the plants", "personal"));
// Rejected: duplicate note.
// false
console.log(addNote("", "work"));
// Rejected: text must be 1-200 characters.
// false
console.log(addNote("x".repeat(201), "work"));
// Rejected: text must be 1-200 characters.
// false
console.log(addNote("Plan a trip", "fun"));
// Rejected: category must be personal, work or study.
// false

// Summary after the successful add
console.log(getSummary());
// "6 notes: 3 personal, 2 study, 1 work."