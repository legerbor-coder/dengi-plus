const STORAGE_KEY = "dengiPlusTransactions";

let transactions = [];
let editingId = null;

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
    console.error("Не удалось загрузить операции:", error);
}

function saveTransactions() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(transactions)
        );
        return true;
    } catch (error) {
        alert("Не удалось сохранить данные. Проверь настройки браузера.");
        console.error("Ошибка сохранения:", error);
        return false;
    }
}

function formatMoney(amount) {
    return new Intl.NumberFormat("ru-RU", {
        maximumFractionDigits: 2
    }).format(amount) + " ₽";
}

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

function editTransaction(id) {
    const item = transactions.find(transaction => transaction.id === id);

    if (!item) return;

    editingId = id;

    const form = document.getElementById("operation-form");
    const transactionForm = document.getElementById("transaction-form");

    form.hidden = false;
    transactionForm.dataset.type = item.type;

    document.getElementById("form-title").textContent =
        "Редактировать операцию";

    document.getElementById("amount").value = item.amount;
    document.getElementById("description").value = item.description;
    document.getElementById("category").value = item.category;
    document.getElementById("date").value = item.date;

    document.getElementById("amount").focus();
}

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

    const count = transactions.length;

    const word = count % 10 === 1 && count % 100 !== 11
        ? "операция"
        : count % 10 >= 2 && count % 10 <= 4 &&
          !(count % 100 >= 12 && count % 100 <= 14)
            ? "операции"
            : "операций";

    document.getElementById("operation-count").textContent =
        `${count} ${word}`;
}

function renderHistory() {
    const history = document.getElementById("history");
    history.replaceChildren();

    if (transactions.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";

        const icon = document.createElement("div");
        icon.className = "empty-icon";
        icon.textContent = "₽";

        const title = document.createElement("p");
        title.textContent = "Пока нет операций";

        const description = document.createElement("span")
        description.textContent = "Добавь свой первый доход или расход";

        empty.append(icon, title, description);
        history.append(empty);
        return;
    }

    const sorted = [...transactions].sort((a, b) =>
        b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
    );

    sorted.forEach(item => {
        const row = document.createElement("div");
        row.className = "transaction-row";

        const icon = document.createElement("div");
        icon.className = "transaction-icon";
        icon.textContent = item.type === "income" ? "↙" : "↗";

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
        editButton.textContent = "Изменить";
        editButton.type = "button";
        editButton.addEventListener("click", () => {
            editTransaction(item.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Удалить";
        deleteButton.type = "button";
        deleteButton.addEventListener("click", () => {
            deleteTransaction(item.id);
        });

        right.append(amount, editButton, deleteButton);
        row.append(icon, details, right);
        history.append(row);
    });
}

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

        if (index === -1) {
            alert("Операция не найдена.");
            return;
        }

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

updateBalance();
renderHistory();
const GOALS_STORAGE_KEY = "dengiPlusGoals";

let financialGoals = [];

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
    console.error("Не удалось загрузить финансовые цели:", error);
}

function saveGoals() {
    try {
        localStorage.setItem(
            GOALS_STORAGE_KEY,
            JSON.stringify(financialGoals)
        );
        return true;
    } catch (error) {
        alert("Не удалось сохранить финансовые цели.");
        console.error(error);
        return false;
    }
}

function renderGoals() {
    const list = document.getElementById("goals-list");
    if (!list) return;

    list.replaceChildren();

    if (financialGoals.length === 0) {
        const message = document.createElement("p");
        message.textContent = "Пока нет целей. Добавь первую цель накопления!";
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
                financialGoals = previous;}

                renderGoals();
            });
    
            actions.append(addButton, deleteButton);
            card.append(title, amounts, progress, percentText, actions);
            list.append(card);
        });
    }
    
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
    
    renderGoals();