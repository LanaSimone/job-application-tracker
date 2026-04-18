import { useEffect, useState } from "react";
import "./App.css";

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
  const [applications, setApplications] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState("default");

  useEffect(() => {
    fetchApplications();
  }, []);

  async function fetchApplications() {
    const response = await fetch("http://localhost:5000/api/applications");
    const data = await response.json();
    setApplications(data);
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

    const response = await fetch("http://localhost:5000/api/applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
    });

    const newApplication = await response.json();

    setApplications((currentApplications) => [
      newApplication,
      ...currentApplications
    ]);

    setFormData(initialFormData);
  }

  async function handleDelete(id) {
    await fetch(`http://localhost:5000/api/applications/${id}`, {
      method: "DELETE"
    });

    setApplications((currentApplications) =>
      currentApplications.filter((application) => application.id !== id)
    );
  }

  async function handleStatusChange(id, newStatus) {
    try {
      const response = await fetch(
        `http://localhost:5000/api/applications/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ status: newStatus })
        }
      );

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
          app.company.toLowerCase().includes(searchLower) ||
          app.role.toLowerCase().includes(searchLower) ||
          app.location.toLowerCase().includes(searchLower)
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

  return (
    <div className="container">
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
            />

            <input
              name="company"
              placeholder="Company"
              value={formData.company}
              onChange={handleInputChange}
            />

            <input
              name="role"
              placeholder="Position"
              value={formData.role}
              onChange={handleInputChange}
            />

            <input
              name="location"
              placeholder="Location"
              value={formData.location}
              onChange={handleInputChange}
            />

            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
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