const USERS_URL = "https://jsonplaceholder.typicode.com/users";

// Select the elements
const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusMessage = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

// All loaded users are stored here so filtering never needs a new request
let users = [];

// Fetch the users from the API
async function loadUsers() {
  statusMessage.textContent = "Loading users...";
  loadButton.disabled = true;

  try {
    const response = await fetch(USERS_URL);

    if (!response.ok) {
      throw new Error(`The server responded with status ${response.status}`);
    }

    users = await response.json();
    renderUsers(getFilteredUsers());
    statusMessage.textContent = `Loaded ${users.length} users successfully.`;
  } catch (error) {
    statusMessage.textContent = `Error: could not load users. ${error.message}`;
  } finally {
    loadButton.disabled = false;
  }
}

// Users whose name includes the typed text (not case-sensitive)
function getFilteredUsers() {
  const search = filterInput.value.trim().toLowerCase();
  return users.filter(function (user) {
    return user.name.toLowerCase().includes(search);
  });
}

// Draw any array of users (textContent only, never innerHTML)
function renderUsers(list) {
  usersList.textContent = "";

  if (list.length === 0 && users.length > 0) {
    const empty = document.createElement("li");
    empty.textContent = "No users match your filter.";
    usersList.append(empty);
    return;
  }

  for (const user of list) {
    const item = document.createElement("li");

    const name = document.createElement("strong");
    name.textContent = user.name;

    const email = document.createElement("p");
    email.textContent = `Email: ${user.email}`;

    const city = document.createElement("p");
    city.textContent = `City: ${user.address.city}`;

    const company = document.createElement("p");
    company.textContent = `Company: ${user.company.name}`;

    item.append(name, email, city, company);
    usersList.append(item);
  }
}

loadButton.addEventListener("click", loadUsers);

// Filter the stored array as the user types, without a new request
filterInput.addEventListener("input", function () {
  const filtered = getFilteredUsers();
  renderUsers(filtered);
  if (users.length > 0) {
    statusMessage.textContent = `Showing ${filtered.length} of ${users.length} users.`;
  }
});