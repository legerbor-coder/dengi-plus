const STORAGE_KEY = "dengiPlusTransactions";
const GOALS_STORAGE_KEY = "dengiPlusGoals";

let transactions = [];
let financialGoals = [];
let editingId = null;

// ЗАГРУЗКА ОПЕРАЦИЙ
try {
const savedData = localStorage.getItem(STORAGE_KEY);
const parsedData = savedData ? JSON.parse(savedData) : [];

if (Array.isArray(parsedData)) {
transactions = parsedData.filter(item =>
item &&
typeof item.id === "string" &&
["income", "expense"].includes(item.type) &&
Number.isFinite(item.amount) &&
item.amount > 0 &&
typeof item.description === "string" &&
typeof item.category === "string" &&
typeof item.date === "string"
);
}
} catch (error) {
console.error("Ошибка загрузки операций:", error);
}

// ЗАГРУЗКА ЦЕЛЕЙ
try {
const savedGoals = localStorage.getItem(GOALS_STORAGE_KEY);
const parsedGoals = savedGoals ? JSON.parse(savedGoals) : [];

if (Array.isArray(parsedGoals)) {
financialGoals = parsedGoals.filter(goal =>
goal &&
typeof goal.id === "string" &&
typeof goal.name === "string" &&
Number.isFinite(goal.target) &&
goal.target > 0 &&
Number.isFinite(goal.saved) &&
goal.saved >= 0
);
}
} catch (error) {
console.error("Ошибка загрузки целей:", error);
}

// СОХРАНЕНИЕ
function saveTransactions() {
try {
localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
return true;
} catch (error) {
alert("Не удалось сохранить операции.");
console.error(error);
return false;
}
}

function saveGoals() {
try {
localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(financialGoals));
return true;
} catch (error) {
alert("Не удалось сохранить цели.");
console.error(error);
return false;
}
}

// ФОРМАТ ДЕНЕГ
function formatMoney(amount) {
return new Intl.NumberFormat("ru-RU", {
maximumFractionDigits: 2
}).format(amount) + " ₽";
}

// ОТКРЫТИЕ ФОРМЫ
function openForm(type) {
editingId = null;

const form = document.getElementById("operation-form");
const transactionForm = document.getElementById("transaction-form");

form.hidden = false;
transactionForm.reset();
transactionForm.dataset.type = type;

document.getElementById("form-title").textContent =
type === "income" ? "Добавить доход" : "Добавить расход";

document.getElementById("date").value =
new Date().toLocaleDateString("sv-SE");

document.getElementById("amount").focus();
}

function closeForm() {
document.getElementById("operation-form").hidden = true;
editingId = null;
}

// РЕДАКТИРОВАНИЕ ОПЕРАЦИИ
function editTransaction(id) {
const item = transactions.find(item => item.id === id);
if (!item) return;

editingId = id;

document.getElementById("operation-form").hidden = false;

const form = document.getElementById("transaction-form");
form.dataset.type = item.type;

document.getElementById("form-title").textContent =
"Редактировать операцию";

document.getElementById("amount").value = item.amount;
document.getElementById("description").value = item.description;
document.getElementById("category").value = item.category;
document.getElementById("date").value = item.date;
}

// ОБНОВЛЕНИЕ БАЛАНСА
function updateBalance() {
const totalIncome = transactions
.filter(item => item.type === "income")
.reduce((sum, item) => sum + item.amount, 0);

const totalExpense = transactions
.filter(item => item.type === "expense")
.reduce((sum, item) => sum + item.amount, 0);

document.getElementById("balance").textContent =
formatMoney(totalIncome - totalExpense);

document.getElementById("income").textContent =
"+ " + formatMoney(totalIncome);

document.getElementById("expense").textContent =
"− " + formatMoney(totalExpense);

renderAnalytics();
}

// ИСТОРИЯ ОПЕРАЦИЙ
function renderHistory() {
const history = document.getElementById("history");
const typeFilter = document.getElementById("filter-type");
const categoryFilter = document.getElementById("filter-category");
const periodFilter = document.getElementById("filter-period");

if (!history || !typeFilter || !categoryFilter || !periodFilter) return;

const selectedType = typeFilter.value;
const selectedCategory = categoryFilter.value;
const selectedPeriod = periodFilter.value;

const categories = [...new Set(
transactions.map(item => item.category)
)].sort();

categoryFilter.replaceChildren();

const allOption = document.createElement("option");
allOption.value = "all";
allOption.textContent = "Все категории";
categoryFilter.append(allOption);

categories.forEach(category => {
const option = document.createElement("option");
option.value = category;
option.textContent = category;
categoryFilter.append(option);
});

categoryFilter.value = categories.includes(selectedCategory)
? selectedCategory
: "all";

let filtered = [...transactions];

if (selectedType !== "all") {
filtered = filtered.filter(item => item.type === selectedType);
}

if (categoryFilter.value !== "all") {
filtered = filtered.filter(item =>
item.category === categoryFilter.value
);
}

const now = new Date();
const today = new Date(
now.getFullYear(),
now.getMonth(),
now.getDate()
);

if (selectedPeriod === "today") {
filtered = filtered.filter(item =>
item.date === today.toLocaleDateString("sv-SE")
);
}

if (selectedPeriod === "week") {
const monday = new Date(today);
const day = monday.getDay();
monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));

filtered = filtered.filter(item => {
const date = new Date(item.date + "T00:00:00");
return date >= monday && date <= today;
});
}

if (selectedPeriod === "month") {
filtered = filtered.filter(item => {
const date = new Date(item.date + "T00:00:00");

return date.getMonth() === now.getMonth() &&
date.getFullYear() === now.getFullYear();
});
}

const count = filtered.length;
const word = count % 10 === 1 && count % 100 !== 11
? "операция"
: count % 10 >= 2 && count % 10 <= 4 &&
!(count % 100 >= 12 && count % 100 <= 14)
? "операции"
: "операций";

document.getElementById("operation-count").textContent =
`${count} ${word}`;

history.replaceChildren();

if (filtered.length === 0) {
const empty = document.createElement("div");
empty.className = "empty-state";

const title = document.createElement("p");
title.textContent = transactions.length === 0
? "Пока нет операций"
: "Операций не найдено";

const description = document.createElement("span");
description.textContent = transactions.length === 0
? "Добавь свой первый доход или расход"
: "Попробуй изменить фильтры";

empty.append(title, description);
history.append(empty);
return;
}

const sorted = filtered.sort((a, b) =>
b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
);

sorted.forEach(item => {
const row = document.createElement("div");
row.className = "transaction-row";

const icon = document.createElement("div");
icon.className = "transaction-icon";
icon.textContent = item.type === "income" ? "↙️" : "↗️";

const details = document.createElement("div");
details.className = "transaction-details";

const name = document.createElement("strong");
name.textContent = item.description;

const info = document.createElement("span");
info.textContent = `${item.category} · ${item.date}`;

details.append(name, info);

const right = document.createElement("div");
right.className = "transaction-right";

const amount = document.createElement("strong");
amount.className = item.type;
amount.textContent =
(item.type === "income" ? "+ " : "− ") +
formatMoney(item.amount);

const editButton = document.createElement("button");
editButton.className = "edit-button";
editButton.type = "button";
editButton.textContent = "Изменить";
editButton.addEventListener("click", () => {
editTransaction(item.id);
});

const deleteButton = document.createElement("button");
deleteButton.className = "delete-button";
deleteButton.type = "button";
deleteButton.textContent = "Удалить";
deleteButton.addEventListener("click", () => {
deleteTransaction(item.id);
});

right.append(amount, editButton, deleteButton);
row.append(icon, details, right);
history.append(row);
});
}

// УДАЛЕНИЕ ОПЕРАЦИИ
function deleteTransaction(id) {
const previous = transactions;
transactions = transactions.filter(item => item.id !== id);

if (!saveTransactions()) {
transactions = previous;
return;
}

updateBalance();
renderHistory();
}

// ДОБАВЛЕНИЕ И ИЗМЕНЕНИЕ ОПЕРАЦИИ
document.getElementById("transaction-form").addEventListener("submit", event => {
event.preventDefault();

const form = event.currentTarget;
const amount = Number(document.getElementById("amount").value);
const description = document.getElementById("description").value.trim();
const category = document.getElementById("category").value;
const date = document.getElementById("date").value;
const type = form.dataset.type;

if (
!Number.isFinite(amount) ||
amount <= 0 ||
!description ||
!category ||
!date ||
!["income", "expense"].includes(type)
) {
alert("Проверь сумму, название, категорию и дату операции.");
return;
}

const previous = transactions.map(item => ({ ...item }));

if (editingId !== null) {
const index = transactions.findIndex(item => item.id === editingId);

if (index === -1) return;

transactions[index] = {
...transactions[index],
type,
amount,
description,
category,
date
};
} else {
transactions.push({
id: crypto.randomUUID(),
type,
amount,
description,
category,
date
});
}

if (!saveTransactions()) {
transactions = previous;
return;
}

updateBalance();
renderHistory();

form.reset();
closeForm();
});

// ОТОБРАЖЕНИЕ ЦЕЛЕЙ НА ГЛАВНОЙ
function renderHomeGoals() {
const list = document.getElementById("home-goals-list");
if (!list) return;

list.replaceChildren();

if (financialGoals.length === 0) {
const message = document.createElement("p");
message.textContent = "Пока нет целей накопления.";
list.append(message);
return;
}

financialGoals.forEach(goal => {
const card = document.createElement("div");
card.className = "goal-card";

const title = document.createElement("h3");
title.textContent = goal.name;

const amounts = document.createElement("div");
amounts.className = "goal-amounts";

const saved = document.createElement("span");
saved.textContent = formatMoney(goal.saved);

const target = document.createElement("span");
target.textContent = "из " + formatMoney(goal.target);

amounts.append(saved, target);

const progress = document.createElement("div");
progress.className = "goal-progress";

const fill = document.createElement("div");
fill.className = "goal-progress-fill";

const percent = Math.min(
100,
Math.round(goal.saved / goal.target * 100)
);

fill.style.width = percent + "%";
progress.append(fill);

const percentText = document.createElement("span");
percentText.className = "goal-percent";
percentText.textContent = goal.saved >= goal.target
? "Цель достигнута! 🎉"
: percent + "% накоплено";

card.append(title, amounts, progress, percentText);
list.append(card);
});
}

// ОТОБРАЖЕНИЕ ЦЕЛЕЙ ВО ВКЛАДКЕ «ЦЕЛИ»
function renderGoals() {
const list = document.getElementById("goals-list");

if (list) {
list.replaceChildren();

if (financialGoals.length === 0) {
const message = document.createElement("p");
message.textContent =
"Пока нет целей. Добавь первую цель накопления!";
list.append(message);
} else {
financialGoals.forEach(goal => {
const card = document.createElement("div");
card.className = "goal-card";

const title = document.createElement("h3");
title.textContent = goal.name;

const amounts = document.createElement("div");
amounts.className = "goal-amounts";

const savedText = document.createElement("span");
savedText.textContent = formatMoney(goal.saved);

const targetText = document.createElement("span");
targetText.textContent = "из " + formatMoney(goal.target);

amounts.append(savedText, targetText);

const progress = document.createElement("div");
progress.className = "goal-progress";

const fill = document.createElement("div");
fill.className = "goal-progress-fill";

const percent = Math.min(
100,
Math.round(goal.saved / goal.target * 100)
);

fill.style.width = percent + "%";
progress.append(fill);

const percentText = document.createElement("span");
percentText.className = "goal-percent";
percentText.textContent = goal.saved >= goal.target
? "Цель достигнута! 🎉"
: percent + "% накоплено";

const actions = document.createElement("div");
actions.className = "goal-actions";

const addButton = document.createElement("button");
addButton.type = "button";
addButton.className = "goal-add-button";
addButton.textContent = "Добавить накопления";

addButton.addEventListener("click", () => {
const answer = prompt(
"Сколько добавить к накоплениям (₽)?"
);

if (answer === null || answer.trim() === "") return;

const amount = Number(answer);

if (!Number.isFinite(amount) || amount <= 0) {
alert("Введи сумму больше нуля.");
return;
}

const previous = financialGoals.map(item => ({ ...item }));
goal.saved += amount;

if (!saveGoals()) {
financialGoals = previous;
}

renderGoals();
});

const deleteButton = document.createElement("button");
deleteButton.type = "button";
deleteButton.className = "goal-delete-button";
deleteButton.textContent = "Удалить цель";

deleteButton.addEventListener("click", () => {
if (!confirm(`Удалить цель «${goal.name}»?`)) return;

const previous = financialGoals;
financialGoals = financialGoals.filter(
item => item.id !== goal.id
);

if (!saveGoals()) {
financialGoals = previous;
}

renderGoals();
});

actions.append(addButton, deleteButton);
card.append(title, amounts, progress, percentText, actions);
list.append(card);
});
}
}

renderHomeGoals();
}

// ДОБАВЛЕНИЕ НОВОЙ ЦЕЛИ
document.getElementById("goal-form").addEventListener("submit", event => {
event.preventDefault();

const name = document.getElementById("goal-name").value.trim();
const target = Number(document.getElementById("goal-target").value);
const saved = Number(document.getElementById("goal-saved").value);

if (
!name ||
!Number.isFinite(target) ||
target <= 0 ||
!Number.isFinite(saved) ||
saved < 0
) {
alert("Проверь название цели и суммы.");
return;
}

financialGoals.push({
id: crypto.randomUUID(),
name,
target,
saved
});

if (!saveGoals()) {
financialGoals.pop();
return;
}

event.currentTarget.reset();
document.getElementById("goal-saved").value = "0";

renderGoals();
});

// АНАЛИТИКА
function renderAnalytics() {
const incomeElement = document.getElementById("analytics-income");
const expenseElement = document.getElementById("analytics-expense");
const balanceElement = document.getElementById("analytics-balance");
const categoriesElement = document.getElementById("analytics-categories");

if (!incomeElement || !expenseElement || !balanceElement || !categoriesElement) {
return;
}

const totalIncome = transactions
.filter(item => item.type === "income")
.reduce((sum, item) => sum + item.amount, 0);

const totalExpense = transactions
.filter(item => item.type === "expense")
.reduce((sum, item) => sum + item.amount, 0);

incomeElement.textContent = formatMoney(totalIncome);
expenseElement.textContent = formatMoney(totalExpense);
balanceElement.textContent = formatMoney(totalIncome - totalExpense);

categoriesElement.replaceChildren();
// График расходов по месяцам
const monthlyChart = document.getElementById("monthly-chart");

if (monthlyChart) {
    monthlyChart.replaceChildren();

    const monthlyExpenses = {};

    transactions
        .filter(item => item.type === "expense")
        .forEach(item => {
            const date = new Date(item.date + "T00:00:00");

            if (isNaN(date.getTime())) return;

            const monthKey =
                `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

            monthlyExpenses[monthKey] =
                (monthlyExpenses[monthKey] || 0) + item.amount;
        });

    const months = Object.entries(monthlyExpenses)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-6);

    const maxExpense = Math.max(
        ...months.map(item => item[1]),
        1
    );

    months.forEach(([month, amount]) => {
        const column = document.createElement("div");
        column.className = "monthly-chart-column";

        const value = document.createElement("strong");
        value.textContent = formatMoney(amount);

        const bar = document.createElement("div");
        bar.className = "monthly-chart-bar";

        const fill = document.createElement("div");
        fill.className = "monthly-chart-fill";

        fill.style.height =
            `${Math.max(amount / maxExpense * 100, 4)}%`;

        bar.append(fill);

        const label = document.createElement("span");
        const [year, monthNumber] = month.split("-");

        label.textContent = new Date(
            Number(year),
            Number(monthNumber) - 1
        ).toLocaleDateString("ru-RU", {
            month: "short"
        });

        column.append(value, bar, label);
        monthlyChart.append(column);
    });

    if (months.length === 0) {
        monthlyChart.textContent = "Пока нет расходов";
    }
}
const chart = document.getElementById("analytics-chart");
const chartTotal = document.getElementById("chart-total");

if (chart && chartTotal) {
    chartTotal.textContent = formatMoney(totalIncome);

    const colors = [
        "#00e5a0",
        "#ff496d",
        "#4285f4",
        "#ffbd4a",
        "#a78bfa",
        "#22d3ee",
        "#f472b6",
        "#fb923c"
    ];

    const expenses = transactions
    .filter(item => item.type === "expense")
    .reduce((result, item) => {
        result[item.category] =
            (result[item.category] || 0) + item.amount;
        return result;
    }, {});

const entries = [
    ["Доходы", totalIncome],
    ...Object.entries(expenses)
].filter(([category, amount]) => amount > 0);
    const legend = document.getElementById("analytics-legend");

if (legend) {
    legend.replaceChildren();

    entries.forEach(([category, amount], index) => {
        const item = document.createElement("div");
        item.className = "analytics-legend-item";

        const dot = document.createElement("div");
        dot.className = "analytics-legend-dot";
        dot.style.background = colors[index % colors.length];

        const name = document.createElement("span");
        name.textContent = category;

        const value = document.createElement("strong");
        value.textContent = formatMoney(amount);

        item.append(dot, name, value);
        legend.append(item);
    });
}
    let currentPercent = 0;

    const segments = entries.map(([category, amount], index) => {
        const totalForChart = entries.reduce(
            (sum, entry) => sum + entry[1],
            0
        );
        
        const percent = totalForChart > 0
            ? amount / totalForChart * 100
            : 0;

        const start = currentPercent;
        currentPercent += percent;

        return `${colors[index % colors.length]} ${start}% ${currentPercent}%`;
    });

    chart.style.background = entries.length
        ? `conic-gradient(${segments.join(", ")})`
        : "#263b50";
}

const expensesByCategory = {};

transactions
.filter(item => item.type === "expense")
.forEach(item => {
expensesByCategory[item.category] =
(expensesByCategory[item.category] || 0) + item.amount;
});

const categories = Object.entries(expensesByCategory)
.sort((a, b) => b[1] - a[1]);

if (categories.length === 0) {
const message = document.createElement("p");
message.textContent = "Пока нет расходов для анализа.";
categoriesElement.append(message);
return;
}

categories.forEach(([category, amount]) => {
const percent = totalExpense > 0
? Math.round(amount / totalExpense * 100)
: 0;

const item = document.createElement("div");
item.className = "analytics-category";

const heading = document.createElement("div");
heading.className = "analytics-category-heading";

const name = document.createElement("strong");
name.textContent = category;

const value = document.createElement("span");
value.textContent = formatMoney(amount);

heading.append(name, value);

const bar = document.createElement("div");
bar.className = "analytics-bar";

const fill = document.createElement("div");
fill.className = "analytics-bar-fill";
fill.style.width = percent + "%";

bar.append(fill);

const percentage = document.createElement("small");
percentage.textContent = percent + "% расходов";

item.append(heading, bar, percentage);
categoriesElement.append(item);
});
}

// ФИЛЬТРЫ
document.getElementById("filter-type").addEventListener("change", renderHistory);
document.getElementById("filter-category").addEventListener("change", renderHistory);
document.getElementById("filter-period").addEventListener("change", renderHistory);

// ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ
const navigationButtons = document.querySelectorAll(".nav-button");
const screens = document.querySelectorAll(".app-screen");

navigationButtons.forEach(button => {
button.addEventListener("click", () => {
const screenName = button.dataset.screen;

screens.forEach(screen => {
screen.hidden = true;
});

const selectedScreen = document.getElementById("screen-" + screenName);

if (selectedScreen) {
selectedScreen.hidden = false;
}

navigationButtons.forEach(navButton => {
navButton.classList.remove("active");
});

button.classList.add("active");

window.scrollTo({
top: 0,
behavior: "smooth"
});
});
});

// ПЕРВОНАЧАЛЬНАЯ ЗАГРУЗКА
updateBalance();
renderHistory();
renderGoals();
renderAnalytics();
