import { useEffect, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL;

function getAuthHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };
}

const initialFormData = {
  company: "",
  role: "",
  status: "Applied",
  location: "",
  salary: "",
  jobLink: "",
  dateApplied: "",
  description: "",
  notes: ""
};

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [authMode, setAuthMode] = useState("login");
  const [authFormData, setAuthFormData] = useState({
    username: "",
    email: "",
    password: ""
  });
  const [authError,setAuthError] = useState("");

  const [applications, setApplications] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("default");

  useEffect(() => {
  if (token) {
    fetchApplications();
  } else {
    setApplications([]);
  }
}, [token]);

  async function fetchApplications() {
  try {
    const response = await fetch(`${API_URL}/api/applications`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Failed to fetch applications:", data);
      setApplications([]);
      return;
    }

    setApplications(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("Error fetching applications:", error);
    setApplications([]);
  }
}

function handleAuthInputChange(event) {
  const { name, value } = event.target;

  setAuthFormData((currentData) => ({
    ...currentData,
    [name]: value
  }));
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  setAuthError("");

  const endpoint =
    authMode === "login" ? "/api/login" : "/api/register";

  const requestBody =
    authMode === "login"
      ? {
          email: authFormData.email,
          password: authFormData.password
        }
      : {
          username: authFormData.username,
          email: authFormData.email,
          password: authFormData.password
        };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      setAuthError(data.error || "Authentication failed");
      return;
    }

    if (authMode === "register") {
      const loginResponse = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: authFormData.email,
          password: authFormData.password
        })
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        setAuthError(loginData.error || "Registration succeeded but login failed");
        return;
      }

      localStorage.setItem("token", loginData.token);
      setToken(loginData.token);
    } else {
      localStorage.setItem("token", data.token);
      setToken(data.token);
    }

    setAuthFormData({
      username: "",
      email: "",
      password: ""
    });
  } catch (error) {
    console.error("Authentication error:", error);
    setAuthError("Something went wrong. Please try again.");
  }
}

async function handleDemoLogin() {
  setAuthError("");

  try {
    const response = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: "demo@test.com",
        password: "demo123"
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setAuthError("Demo login failed");
      return;
    }

    localStorage.setItem("token", data.token);
    setToken(data.token);
  } catch (error) {
    console.error("Demo login error:", error);
    setAuthError("Demo login failed");
  }
}

function handleLogout() {
  localStorage.removeItem("token");
  setToken("");
  setApplications([]);
}

  function handleInputChange(event) {
    const { name, value } = event.target;
    setFormData({
      ...formData,
      [name]: value
    });
  }

  async function handleSubmit(event) {
  event.preventDefault();

  const trimmedFormData = {
    ...formData,
    company: formData.company.trim(),
    role: formData.role.trim(),
    location: formData.location.trim(),
    dateApplied: formData.dateApplied.trim()
  };

  if (
    !trimmedFormData.dateApplied ||
    !trimmedFormData.company ||
    !trimmedFormData.role ||
    !trimmedFormData.location
  ) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/applications`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify(trimmedFormData)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Failed to create application:", data);
      return;
    }

    setApplications((currentApplications) => [
      data,
      ...currentApplications
    ]);

    setFormData(initialFormData);
  } catch (error) {
    console.error("Error creating application:", error);
  }
}

  async function handleStatusChange(id, newStatus) {
    try {
      const response = await fetch(`${API_URL}/api/applications/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(token),
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      setApplications((currentApplications) =>
        currentApplications.map((application) =>
          application.id === id
            ? { ...application, status: newStatus }
            : application
        )
      );
    } catch (error) {
      console.error(error);
    }
  }

  const statusFiltered =
    filter === "All"
      ? applications
      : applications.filter((app) => app.status === filter);

  const searchLower = search.toLowerCase();

  const filteredApplications = searchLower
  ? applications.filter((app) => {
      return (
        (app.company || "").toLowerCase().includes(searchLower) ||
        (app.role || "").toLowerCase().includes(searchLower) ||
        (app.location || "").toLowerCase().includes(searchLower)
      );
    })
  : statusFiltered;

  const sortedApplications = [...filteredApplications];

  if (sortOption === "company-asc") {
    sortedApplications.sort((a, b) => {
      return a.company.localeCompare(b.company);
    });
  }

  if (sortOption === "company-desc") {
    sortedApplications.sort((a, b) => {
      return b.company.localeCompare(a.company);
    });
  }

  if (sortOption === "newest") {
    sortedApplications.sort((a, b) => {
      return new Date(b.date_applied) - new Date(a.date_applied);
    });
  }

  if (sortOption === "oldest") {
    sortedApplications.sort((a, b) => {
      return new Date(a.date_applied) - new Date(b.date_applied);
    });
  }

  if (!token) {
  return (
    <div className="container auth-page">
      <section className="top-section auth-layout">
        <div className="page-intro">
          <p className="hero-eyebrow">Smart Application Assistant</p>
          <h1 className="intro-title">
            Track your job applications in one place
          </h1>
          <p className="intro-text">
            Create an account or log in to manage your applications securely.
          </p>
        </div>
        <div className="form-section auth-card">
          <p className="section-title">
            {authMode === "login" ? "Login" : "Create Account"}
          </p>
          <form onSubmit={handleAuthSubmit} className="application-form auth-form">
            {authMode === "register" && (
              <input
                name="username"
                placeholder="Username"
                value={authFormData.username}
                onChange={handleAuthInputChange}
              />
            )}
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={authFormData.email}
              onChange={handleAuthInputChange}
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={authFormData.password}
              onChange={handleAuthInputChange}
            />
            {authError && <p className="auth-error">{authError}</p>}
            <button type="submit" className="primary-button">
              {authMode === "login" ? "Login" : "Register"}
            </button>
          </form>
          <div className="demo-section">
          <button
            type="button"
            className="secondary-button"
            onClick={handleDemoLogin}
          >
            Try Demo Account
          </button>

          <p className="demo-hint">
            No signup needed — try the demo account
          </p>
        </div>
          <button
            type="button"
            className="text-button"
            onClick={() =>
              setAuthMode(authMode === "login" ? "register" : "login")
            }
          >
            {authMode === "login"
              ? "Need an account? Register"
              : "Already have an account? Login"}
          </button>
        </div>
      </section>
    </div>
  );
}
  return (
    <div className="container">
        <div className="top-bar">
        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
        >
          Sign Out
        </button>
      </div>
      <section className="top-section">
        <div className="page-intro">
          <p className="hero-eyebrow">Smart Application Assistant</p>
          <h1 className="intro-title">Stay organized with your applications</h1>
          <p className="intro-text">
            Track job opportunities, update statuses, and keep everything in one
            place with a cleaner, more visual workflow.
          </p>
          <div className="hero-badges">
            <span>Track applications</span>
            <span>Monitor progress</span>
            <span>Stay organized</span>
          </div>
        </div>
        <div className="form-section">
          <p className="section-title">Add Application</p>
          <form onSubmit={handleSubmit} className="application-form">
          <input
            type="date"
            name="dateApplied"
            value={formData.dateApplied}
            onChange={handleInputChange}
            required
          />
          <input
            name="company"
            placeholder="Company"
            value={formData.company}
            onChange={handleInputChange}
            required
          />
          <input
            name="role"
            placeholder="Position"
            value={formData.role}
            onChange={handleInputChange}
            required
          />
          <input
            name="location"
            placeholder="Location"
            value={formData.location}
            onChange={handleInputChange}
            required
          />
          <select
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            required
          >
            <option value="Applied">Applied</option>
            <option value="Interviewing">Interviewing</option>
            <option value="Offer">Offer</option>
            <option value="Rejected">Rejected</option>
          </select>
          <button type="submit">Save</button>
        </form>
        </div>
      </section>
      <section className="stats-row">
        <div className="stat-card">
          <p className="stat-label">Total</p>
          <h3>{applications.length}</h3>
        </div>
        <div className="stat-card">
          <p className="stat-label">Interviewing</p>
          <h3>
            {
              applications.filter(
                (application) => application.status === "Interviewing"
              ).length
            }
          </h3>
        </div>
        <div className="stat-card">
          <p className="stat-label">Offers</p>
          <h3>
            {
              applications.filter(
                (application) => application.status === "Offer"
              ).length
            }
          </h3>
        </div>
      </section>
      <section className="applications-section">
        <div className="applications-header">
          <div className="controls">
            <div className="control-group">
              <label>Search</label>
              <input
                placeholder="Search applications"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="control-group">
              <label>Filter</label>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="All">All</option>
                <option value="Applied">Applied</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Rejected">Rejected</option>
                <option value="Offer">Offer</option>
              </select>
            </div>
            <div className="control-group">
              <label>Sort</label>
              <select
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value)}
              >
                <option value="default">Default</option>
                <option value="company-asc">Company A-Z</option>
                <option value="company-desc">Company Z-A</option>
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>
          </div>
        </div>
        <div className="applications-grid">
          {sortedApplications.map((application) => (
            <div className="card" key={application.id}>
              <div className="card-header">
                <div>
                  <h3 className="card-company">{application.company}</h3>
                  <p className="card-role">{application.role}</p>
                </div>
                <span className={`status-badge ${application.status.toLowerCase()}`}>
                  {application.status}
                </span>
              </div>
              <div className="card-details">
                <p>{application.location}</p>
                <p>
                  {application.date_applied
                    ? new Date(application.date_applied).toLocaleDateString()
                    : ""}
                </p>
              </div>
              <div className="card-actions">
                <select
                  value={application.status}
                  onChange={(event) =>
                    handleStatusChange(application.id, event.target.value)
                  }
                >
                  <option value="Applied">Applied</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Offer">Offer</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <button
                  className="delete-button"
                  onClick={() => handleDelete(application.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default App;