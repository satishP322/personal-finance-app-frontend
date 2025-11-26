"use client";

import { useState, useEffect, useRef } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Expense {
  _id?: string;
  date: string;
  category: string;
  amount: number;
  note: string;
}

type Filter = "all" | "weekly" | "monthly" | "annual";

const API_BASE = "https://751b100te2.execute-api.ap-south-1.amazonaws.com/dev";

const categories = [
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Groceries",
  "Entertainment",
  "Hospital",
  "Other",
];

export default function Dashboard() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [monthlyBudget, setMonthlyBudget] = useState(500);
  const [budgetInput, setBudgetInput] = useState(500);
  const [userEmail, setUserEmail] = useState("user@example.com");
  const [userId, setUserId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [limitCategory, setLimitCategory] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categoryLimits, setCategoryLimits] = useState<{ [key: string]: number }>({});
  const [categorySpending, setCategorySpending] = useState<{ [key: string]: number }>({});

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSaveLimit = async () => {
    if (!limitCategory) return alert("Please select a category.");
    const amt = parseFloat(limitAmount);
    if (isNaN(amt) || amt <= 0) return alert("Please enter a valid limit amount.");
    if (!userId) return alert("User not loaded yet. Try again.");

    try {
      const res = await fetch(`${API_BASE}/setCategoryLimit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, category: limitCategory, limitAmount: amt }),
      });

      const data = await res.json();
      if (!res.ok) return alert(data.message || "Failed to save limit");

      setCategoryLimits((prev) => ({ ...prev, [limitCategory]: amt }));

      alert(`Limit saved: ${limitCategory} → ₹${amt}`);
      setLimitCategory("");
      setLimitAmount("");
    } catch (err) {
      console.error(err);
      alert("Failed to save limit. Try again.");
    }
  };

  const fetchCategoryLimits = async (id: string) => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/getCategoryLimits?userId=${id}`);
      if (!res.ok) throw new Error("Failed to fetch limits");

      const data = await res.json();
      console.log("Raw limits data:", data);

      // Use data.limits directly
      const limitsArray = Array.isArray(data.limits) ? data.limits : [];

      console.log("Parsed limits array:", limitsArray);

      const limitsObj: { [key: string]: number } = {};
      limitsArray.forEach((l: any) => {
        if (l.category && l.limitAmount !== undefined) {
          limitsObj[l.category] = Number(l.limitAmount);
        }
      });

      console.log("Fetched category limits:", limitsObj);
      setCategoryLimits(limitsObj);

    } catch (err) {
      console.error("Error fetching category limits:", err);
    }
  };


  const fetchUserAndExpenses = async () => {
    try {
      const idToken = localStorage.getItem("idToken");
      if (!idToken) {
        window.location.href = "/login";
        return;
      }

      const userRes = await fetch("/api/auth/me", {
        headers: {
          "Authorization": `Bearer ${idToken}`,
        },
      });

      if (!userRes.ok) { window.location.href = "/login"; return; }
      const userData = await userRes.json();
      const user = userData.user;
      if (!user || !user.sub) return;
      setUserEmail(user.email);
      setUserId(user.sub);

      await fetchCategoryLimits(user.sub);

      const expRes = await fetch(`${API_BASE}/getExpenses?userId=${user.sub}`);
      if (!expRes.ok) return;
      const raw = await expRes.json().catch(() => null);
      const expensesFromAPI: Expense[] = raw ? Array.isArray(raw) ? raw : JSON.parse(raw.body || "[]") : [];
      setExpenses(expensesFromAPI.map((e: any) => ({ ...e, _id: e.expenseId })));
    } catch (err) {
      console.error("Error fetching user or expenses:", err);
    }
  };

  useEffect(() => {
    fetchUserAndExpenses();
  }, []);



  useEffect(() => {
    const spending: { [key: string]: number } = {};
    expenses.forEach(exp => {
      spending[exp.category] = (spending[exp.category] || 0) + exp.amount;
    });
    setCategorySpending(spending);
  }, [expenses]);

  const filteredExpenses = expenses.filter((e) => {
    const today = dayjs();
    const expDate = dayjs(e.date);
    if (filter === "weekly") {
      const weekStart = today.startOf("week");
      const weekEnd = today.endOf("week");
      if (!expDate.isSameOrAfter(weekStart) || !expDate.isSameOrBefore(weekEnd)) return false;
    }
    if (filter === "monthly" && !expDate.isSame(today, "month")) return false;
    if (filter === "annual" && !expDate.isSame(today, "year")) return false;
    if (categoryFilter && e.category !== categoryFilter) return false;
    return true;
  });

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBudget = monthlyBudget - totalExpenses;

  const handleAddOrEditExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!userId) return;

    const form = e.target as HTMLFormElement;
    const amountValue = parseFloat((form.amount as HTMLInputElement).value);

    if (isNaN(amountValue) || amountValue < 0) return alert("Please enter a valid amount.");

    const newExpense: Expense = {
      date: (form.date as HTMLInputElement).value,
      category: (form.category as HTMLInputElement).value.trim(),
      amount: amountValue,
      note: (form.note as HTMLInputElement).value.trim(),
    };

    if (!newExpense.date || !newExpense.category)
      return alert("Date and Category are required.");

    // ===== Category limit logic =====
    const categoryLimit = categoryLimits[newExpense.category] ?? undefined;

    // Total spent in category including all expenses
    const spentInCategory = expenses
      .filter((e) => e.category === newExpense.category)
      .reduce((sum, e) => sum + e.amount, 0);

    // Predicted spent in category accounting for editing
    const predictedSpent = editingExpense
      ? spentInCategory - editingExpense.amount + newExpense.amount
      : spentInCategory + newExpense.amount;

    if (categoryLimit !== undefined) {
      if (predictedSpent > categoryLimit) {
        // ⚠️ 100% warning
        if (!window.confirm(
          `⚠️ Warning: you exceeded the limit for ${newExpense.category} (₹${categoryLimit}). Add this transaction?`
        )) return;
      } else if (predictedSpent >= 0.8 * categoryLimit) {
        // ⚠️ 80% alert
        window.alert(
          `Alert: You have reached 80% of your ${newExpense.category} limit (₹${categoryLimit}).`
        );
      }
    }

    // ===== Monthly budget logic =====
    const totalExcludingEditing = editingExpense
      ? totalExpenses - editingExpense.amount
      : totalExpenses;

    const predictedTotal = totalExcludingEditing + newExpense.amount;

    if (predictedTotal > monthlyBudget) {
      if (!window.confirm("Warning: your monthly budget exceeded. Add this transaction?")) return;
    }

    try {
      if (editingExpense?._id) {
        // Edit existing expense
        const res = await fetch(`${API_BASE}/editExpense`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            expenseId: editingExpense._id,
            expenseDate: newExpense.date,
            category: newExpense.category,
            amount: newExpense.amount,
            note: newExpense.note,
          }),
        });
        if (!res.ok) throw new Error("Failed to update expense");

        setExpenses((prev) =>
          prev.map((e) =>
            e._id === editingExpense._id ? { ...newExpense, _id: editingExpense._id } : e
          )
        );
        setEditingExpense(null);
      } else {
        // Add new expense
        const res = await fetch(`${API_BASE}/addExpense`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...newExpense, userId }),
        });
        const addedExpense = await res.json();
        setExpenses((prev) => [
          ...prev,
          { ...newExpense, _id: addedExpense?.expenseId || Date.now().toString() },
        ]);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save expense. Please try again.");
    }

    setShowForm(false);
    form.reset();
  };

  const deleteExpense = async (expenseId?: string) => {
    if (!expenseId || !userId) return;
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    try {
      const res = await fetch(`${API_BASE}/deleteExpense`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, expenseId }),
      });
      if (!res.ok) throw new Error("Failed to delete expense");
      setExpenses((prev) => prev.filter((e) => e._id !== expenseId));
    } catch (err) {
      console.error(err);
      alert("Failed to delete expense. Please try again.");
    }
  };

  const handleLogout = () => {
    // Clear all auth info from localStorage
    localStorage.removeItem("idToken");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userId");

    // Redirect to login
    window.location.href = "/login";
  };


  const chartData = {
    labels: [...new Set(filteredExpenses.map((e) => e.category))],
    datasets: [
      {
        label: "Spending by Category",
        data: [...new Set(filteredExpenses.map((e) => e.category))].map((cat) =>
          filteredExpenses.filter((e) => e.category === cat).reduce((sum, e) => sum + e.amount, 0)
        ),
        backgroundColor: ["#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6"],
        borderRadius: 6,
        barThickness: 60,
      },
    ],
  };

  const chartOptions = {
    plugins: { legend: { display: true, position: "top" as const }, tooltip: { enabled: true }, title: { display: true, text: "Spending Breakdown", font: { size: 18 } } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 10 } }, x: { grid: { display: false } } },
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="px-4 py-2 bg-blue-600 text-white font-bold text-2xl rounded-2xl shadow-sm tracking-tight">
          Finlumo
        </h1>
        <div className="relative" ref={dropdownRef}>
          <button
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-400 via-purple-400 to-indigo-400 text-white flex items-center justify-center font-bold text-lg hover:shadow-lg transition-shadow"
            onClick={() => setShowDropdown((prev) => !prev)}
          >
            {userEmail ? userEmail.split("@")[0].charAt(0).toUpperCase() : "U"}
          </button>
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-60 bg-white border border-gray-200 rounded-xl shadow-lg p-4 flex flex-col gap-3">
              <p className="text-gray-700 font-medium truncate">{userEmail}</p>
              <div className="border-t border-gray-200"></div>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Title + Add button */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-700 tracking-wide">Dashboard</h2>
          <button
            className="bg-blue-600 text-white px-3.5 py-1.5 rounded-lg hover:bg-blue-700"
            onClick={() => {
              setShowForm(!showForm);
              setEditingExpense(null);
            }}
          >
            {showForm ? "Cancel" : "+ Add Expense"}
          </button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h3 className="text-lg font-bold mb-4">
              {editingExpense ? "Edit Expense" : "Add New Expense"}
            </h3>
            <form
              onSubmit={handleAddOrEditExpense}
              className="grid grid-cols-1 md:grid-cols-4 gap-4"
            >
              <input
                type="date"
                name="date"
                className="border p-2 rounded"
                required
                defaultValue={editingExpense?.date || ""}
              />
              <select
                name="category"
                className="border p-2 rounded"
                required
                defaultValue={editingExpense?.category || ""}
              >
                <option value="">Select Category</option>
                
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <input
                type="number"
                name="amount"
                className="border p-2 rounded"
                placeholder="Amount"
                required
                defaultValue={editingExpense?.amount || ""}
              />
              <input
                type="text"
                name="note"
                className="border p-2 rounded"
                placeholder="Note (optional)"
                defaultValue={editingExpense?.note || ""}
              />
              <button className="bg-green-600 text-white px-4 py-2 rounded-full hover:bg-green-700">
                {editingExpense ? "Update" : "Add"}
              </button>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          {(["all", "weekly", "monthly", "annual"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-1 rounded-full font-medium transition-colors duration-200 ${
                filter === f
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        
        {/* category filter */}
        <div className="flex gap-3 mb-6 items-center">
          <label className="font-medium">Filter by Category:</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">All</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>


        {/* Budget Input */}
        <div className="mb-6 bg-white p-4 rounded-xl shadow-md flex items-center gap-4">
          <h4 className="font-medium">Set Monthly Budget:</h4>
          <input
            type="number"
            className="border p-2 rounded w-32 bg-gray-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={budgetInput}
            onChange={(e) => setBudgetInput(parseFloat(e.target.value))}
          />
          <button
            onClick={() => setMonthlyBudget(budgetInput)}
            className="bg-green-600 text-white px-4 py-1.5 rounded-full hover:bg-green-700"
          >
            Apply
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-md text-center">
            <p className="text-gray-500">Total Expenses</p>
            <p className="text-3xl font-bold text-red-500">${totalExpenses}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md text-center">
            <p className="text-gray-500">Monthly Budget</p>
            <p className="text-3xl font-bold text-blue-600">${monthlyBudget}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md text-center">
            <p className="text-gray-500">Remaining</p>
            <p className="text-3xl font-bold text-green-600">${remainingBudget}</p>
          </div>
        </div>

        {/* Category-wise Spending Limits */}
        <div className="bg-white p-4 rounded-lg shadow mt-6">
          <h2 className="text-xl font-semibold mb-4">Category-wise Spending Limits</h2>

          {/* Category Dropdown */}
          <label className="block text-sm font-medium text-gray-700">Select Category</label>
          <select
            value={limitCategory}
            onChange={(e) => setLimitCategory(e.target.value)}
            className="w-full p-2 border rounded mt-1"
          >
            <option value="">-- Select Category --</option>
            {[
              "Food",
              "Travel",
              "Shopping",
              "Bills",
              "Groceries",
              "Entertainment",
              "Hospital",
              "Other",
            ].map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          {/* Limit Input */}
          <label className="block text-sm font-medium text-gray-700 mt-4">
            Enter Limit Amount (₹)
          </label>
          <input
            type="number"
            value={limitAmount}
            onChange={(e) => setLimitAmount(e.target.value)}
            className="w-full p-2 border rounded mt-1"
            placeholder="Enter amount"
          />

          {/* Save Button */}
          <button
            onClick={handleSaveLimit}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Save Limit
          </button>
        </div>

        {/* Expense Table */}
        <div className="bg-white p-6 rounded-xl shadow mb-8">
          <h3 className="text-xl font-bold mb-4">Transactions</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-200 text-left">
                <th className="p-3 border">Date</th>
                <th className="p-3 border">Category</th>
                <th className="p-3 border">Amount</th>
                <th className="p-3 border">Note</th>
                <th className="p-3 border text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((exp) => (
                <tr key={exp._id} className="hover:bg-gray-50">
                  <td className="p-3 border">{exp.date}</td>
                  <td className="p-3 border">{exp.category}</td>
                  <td className="p-3 border font-semibold">${exp.amount}</td>
                  <td className="p-3 border">{exp.note}</td>
                  <td className="p-3 border flex justify-center gap-2">
                    <button
                      onClick={() => {
                        setEditingExpense(exp);
                        setShowForm(true);
                      }}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteExpense(exp._id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors text-sm font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Chart */}
        <div className="bg-white p-6 rounded-xl shadow h-[400px]">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </main>
    </div>
  );
}
