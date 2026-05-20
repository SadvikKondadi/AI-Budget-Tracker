import { useEffect, useState } from "react";
import axios from "axios";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
 LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./App.css";

const API_BASE = "https://ai-budget-tracker-backend.onrender.com";

function App({ setIsLoggedIn }) {
  const user = JSON.parse(localStorage.getItem("user"));

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [date, setDate] = useState("");

  const [transactions, setTransactions] = useState([]);
  const [aiStatus, setAiStatus] = useState("");
  const [spendingPrediction, setSpendingPrediction] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatReply, setChatReply] = useState("");
  const [budgetLimit, setBudgetLimit] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterMonth, setFilterMonth] = useState("");

  const [lastUploadId, setLastUploadId] = useState(
    localStorage.getItem("lastUploadId") || ""
  );

  const fetchTransactions = async () => {
    const res = await axios.get(
      `${API_BASE}/transactions/${user.id}`
    );
    setTransactions(res.data);
  };

  const fetchSpendingPrediction = async () => {
    const res = await axios.get(
      `${API_BASE}/predict-spending/${user.id}`
    );
    setSpendingPrediction(res.data.message);
  };

  const fetchBudget = async () => {
    const res = await axios.get(`${API_BASE}/budget`);

    if (res.data.monthly_limit) {
      setBudgetLimit(res.data.monthly_limit);
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    setIsLoggedIn(false);
  };

  const exportPDF = async () => {
    const input = document.getElementById("dashboard-report");

    const canvas = await html2canvas(input, {
      scale: 2,
      useCORS: true,
      scrollY: -window.scrollY,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pdfWidth = 210;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = pdfHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
    heightLeft -= 297;

    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= 297;
    }

    pdf.save("AI_Budget_Report.pdf");
  };

  const saveBudget = async () => {
    if (!budgetLimit) {
      alert("Enter budget limit first");
      return;
    }

    await axios.post(`${API_BASE}/budget`, {
      monthly_limit: parseFloat(budgetLimit),
    });

    alert("Budget saved successfully");
  };

  const predictCategory = async () => {
    if (!title.trim()) {
      alert("Enter title first");
      return;
    }

    setAiStatus("AI is predicting category...");

    const res = await axios.post(`${API_BASE}/predict-category`, {
      title,
    });

    setCategory(res.data.predicted_category);
    setAiStatus(`Predicted: ${res.data.predicted_category}`);
  };

  const handleStatementUpload = async (event) => {
    const file = event.target.files[0];

    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await axios.post(
      `${API_BASE}/upload-statement/${user.id}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    if (res.data.upload_id) {
      localStorage.setItem("lastUploadId", res.data.upload_id);
      setLastUploadId(res.data.upload_id);
    }

    alert(res.data.message);

    fetchTransactions();
    fetchSpendingPrediction();
  };

  const deleteLastUploadedStatement = async () => {
    if (!lastUploadId) {
      alert("No uploaded statement found");
      return;
    }

    const res = await axios.delete(
      `${API_BASE}/upload-statement/${lastUploadId}`
    );

    alert(res.data.message);

    localStorage.removeItem("lastUploadId");
    setLastUploadId("");

    fetchTransactions();
    fetchSpendingPrediction();
  };

  const clearForm = () => {
    setTitle("");
    setAmount("");
    setCategory("");
    setType("");
    setDate("");
    setAiStatus("");
    setIsEditing(false);
    setEditingId(null);
  };

  const addTransaction = async () => {
    if (!title || !amount || !category || !type || !date) {
      alert("Please fill all fields");
      return;
    }

    const transactionData = {
      title,
      amount: parseFloat(amount),
      category,
      type,
      date,
      user_id: user.id,
    };

    if (isEditing) {
      await axios.put(
        `${API_BASE}/transactions/${editingId}`,
        transactionData
      );
    } else {
      await axios.post(
        `${API_BASE}/transactions`,
        transactionData
      );
    }

    clearForm();
    fetchTransactions();
    fetchSpendingPrediction();
  };

  const editTransaction = (transaction) => {
    setIsEditing(true);
    setEditingId(transaction.id);

    setTitle(transaction.title);
    setAmount(transaction.amount);
    setCategory(transaction.category);
    setType(transaction.type);
    setDate(transaction.date || "");
  };

  const deleteTransaction = async (id) => {
    await axios.delete(`${API_BASE}/transactions/${id}`);
    fetchTransactions();
    fetchSpendingPrediction();
  };

  const sendChatMessage = async () => {
    if (!chatMessage.trim()) {
      alert("Enter a question first");
      return;
    }

    const res = await axios.post(`${API_BASE}/chatbot`, {
      message: chatMessage,
      user_id: user.id,
    });

    setChatReply(res.data.reply);
  };

  useEffect(() => {
    fetchTransactions();
    fetchSpendingPrediction();
    fetchBudget();
  }, []);

  const income = transactions
    .filter((t) => t.type.toLowerCase() === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = transactions
    .filter((t) => t.type.toLowerCase() === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = income - expenses;

  const expenseData = Object.values(
    transactions
      .filter((t) => t.type.toLowerCase() === "expense")
      .reduce((acc, t) => {
        if (!acc[t.category]) {
          acc[t.category] = { name: t.category, value: 0 };
        }

        acc[t.category].value += t.amount;

        return acc;
      }, {})
  );

  const trendData = Object.values(
    transactions
      .filter((t) => t.type.toLowerCase() === "expense" && t.date)
      .reduce((acc, t) => {
        const month = t.date.slice(0, 7);

        if (!acc[month]) {
          acc[month] = {
            month,
            amount: 0,
          };
        }

        acc[month].amount += t.amount;

        return acc;
      }, {})
  );

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.title
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      transaction.category
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesType =
      filterType === "All" || transaction.type === filterType;

    const matchesMonth =
      !filterMonth || transaction.date?.slice(0, 7) === filterMonth;

    return matchesSearch && matchesType && matchesMonth;
  });

  const COLORS = [
    "#2563eb",
    "#16a34a",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
  ];

  return (
    <div className="app" id="dashboard-report">
      <header className="header">
        <div>
          <h1>AI Budget Tracker</h1>
          <p>Welcome, {user?.name} 👋</p>
        </div>

        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </header>

      <button className="pdf-btn" onClick={exportPDF}>
        Export PDF Report
      </button>

      <section className="summary">
        <div className="summary-card income">
          <h3>Total Income</h3>
          <h2>${income}</h2>
        </div>

        <div className="summary-card expense">
          <h3>Total Expenses</h3>
          <h2>${expenses}</h2>
        </div>

        <div className="summary-card balance">
          <h3>Balance</h3>
          <h2>${balance}</h2>
        </div>

        <div className="summary-card prediction">
          <h3>AI Spending Prediction</h3>
          <h2>{spendingPrediction || "Loading..."}</h2>
        </div>
      </section>

      <section className="main-grid">
        <div className="form-card">
          <h2>
            {isEditing
              ? "Edit Transaction"
              : "Add Transaction"}
          </h2>

          <input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <button
            className="ai-button"
            onClick={predictCategory}
          >
            Predict Category with AI
          </button>

          {aiStatus && (
            <p className="ai-status">{aiStatus}</p>
          )}

          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <input
            type="number"
            placeholder="Monthly Budget Limit"
            value={budgetLimit}
            onChange={(e) => setBudgetLimit(e.target.value)}
          />

          <button
            className="save-budget-btn"
            onClick={saveBudget}
          >
            Save Budget
          </button>

          <input
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />

          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Select Type</option>
            <option value="Income">Income</option>
            <option value="Expense">Expense</option>
          </select>

          <div className="csv-upload-box">
            <label>Upload Bank Statement</label>

            <input
              type="file"
              accept=".csv,.xlsx,.pdf"
              onChange={handleStatementUpload}
            />

            <small>Supported: CSV, Excel, PDF</small>

            {lastUploadId && (
              <button
                className="delete-upload-btn"
                onClick={deleteLastUploadedStatement}
              >
                Delete Last Uploaded Statement
              </button>
            )}
          </div>

          <button onClick={addTransaction}>
            {isEditing
              ? "Update Transaction"
              : "Add Transaction"}
          </button>

          {isEditing && (
            <button
              className="cancel-edit-btn"
              onClick={clearForm}
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="insight-card">
          <h2>AI Financial Insights</h2>
          <p>Total income: ${income}</p>
          <p>Total expenses: ${expenses}</p>
          <p>Balance: ${balance}</p>
          <p>{spendingPrediction}</p>
        </div>
      </section>

      <section className="chatbot-card">
        <h2>AI Financial Chatbot</h2>

        <div className="chat-box">
          {chatReply ? (
            <p className="bot-reply">{chatReply}</p>
          ) : (
            <p className="bot-message">
              Ask AI about your finances
            </p>
          )}
        </div>

        <div className="chat-input-row">
          <input
            placeholder="Ask finance question..."
            value={chatMessage}
            onChange={(e) =>
              setChatMessage(e.target.value)
            }
          />

          <button onClick={sendChatMessage}>
            Ask AI
          </button>
        </div>
      </section>

      <section className="charts">
        <div className="chart-card">
          <h2>Expense Categories</h2>

          <PieChart width={320} height={280}>
            <Pie
              data={expenseData}
              dataKey="value"
              nameKey="name"
              outerRadius={95}
              label
            >
              {expenseData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>

            <Tooltip />
          </PieChart>
        </div>

        <div className="chart-card">
          <h2>Monthly Expense Trend</h2>

          <LineChart
            width={500}
            height={280}
            data={trendData}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />

            <Line
              type="monotone"
              dataKey="amount"
              stroke="#2563eb"
              strokeWidth={3}
            />
          </LineChart>
        </div>
      </section>

      <h2 className="section-title">
        Transactions History
      </h2>

      <div className="filter-card">
        <input
          type="text"
          placeholder="Search by title/category..."
          value={searchTerm}
          onChange={(e) =>
            setSearchTerm(e.target.value)
          }
        />

        <select
          value={filterType}
          onChange={(e) =>
            setFilterType(e.target.value)
          }
        >
          <option value="All">All</option>
          <option value="Income">Income</option>
          <option value="Expense">Expense</option>
        </select>

        <input
          type="month"
          value={filterMonth}
          onChange={(e) =>
            setFilterMonth(e.target.value)
          }
        />
      </div>

      <section className="transactions">
        {filteredTransactions.map((transaction) => (
          <div
            className="transaction-card"
            key={transaction.id}
          >
            <h3>{transaction.title}</h3>

            <p>
              <b>Amount:</b> ${transaction.amount}
            </p>

            <p>
              <b>Date:</b> {transaction.date}
            </p>

            <p>
              <b>Category:</b> {transaction.category}
            </p>

            <p>
              <b>Type:</b> {transaction.type}
            </p>

            <button
              className="edit-btn"
              onClick={() =>
                editTransaction(transaction)
              }
            >
              Edit
            </button>

            <button
              onClick={() =>
                deleteTransaction(transaction.id)
              }
            >
              Delete
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}

export default App;