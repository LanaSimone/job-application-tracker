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
}

function App() {
  const [applications, setApplications] = useState([])
  const [formData, setFormData] = useState(initialFormData)
  const [filter, setFilter] = useState("All")

  async function fetchApplications() {
    const response = await fetch("http://localhost:5000/api/applications");
    const data = await response.json();
    setApplications(data)
  }

  function handleInputChange(event){
    const {name, value} = event.target;
    setFormData ({
      ...formData,
      [name]: value
    });
  }
  
  useEffect(() => {
    fetchApplications();
  }, [])

  async function handleSubmit(event) {
    event.preventDefault();

    const response = await fetch("http://localhost:5000/api/applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formData)
      
    })

    const newApplication = await response.json()

    setApplications((currentApplications) =>[
      newApplication,
      ...currentApplications
    ])
    setFormData(initialFormData);
  }

  async function handleDelete(id) {
    const response = await fetch(`http://localhost:5000/api/applications/${id}`, {
      method: "DELETE"
    })

    setApplications(current =>
      current.filter(app => app.id !== id)
    )
  }

  const filteredApplications = filter === "All"
    ? applications
    : applications.filter(app => app.status === filter);

  async function handleStatusChange(id, newStatus) {
    try{
    const response = await fetch(`http://localhost:5000/api/applications/${id}`,{
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({status:newStatus})
    });

    if (!response.ok) {
      throw new Error("Failed to update status")
    }

    setApplications(current =>
      current.map(app => 
        app.id === id
        ? { ...app, status: newStatus}
        : app
      )
    )
    
  } catch (error) {
    console.error(error);
    }
  }

  function getStatusColor(status){
    if(status === "Applied") return "gray";
    if(status === "Interviewing") return "blue";
    if(status === "Offer") return "green";
    if(status === "Rejected") return "red"
  }


  return (
    <div className="container">
      <div className="form-section">
        <p className="section-title">Add Application</p>
        <form onSubmit={handleSubmit}>
          <input
          type="date"
          name="dateApplied"
          placeholder="Date Applied"
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
      <div className="stats-row">
        <div className="stat-card">
          <p className="stat-label">Total</p>
          <h3>{applications.length}</h3>
        </div>
        <div className="stat-card">
          <p className="stat-label">Interviewing</p>
          <h3>{applications.filter(app => app.status === "Interviewing").length}</h3>
        </div>
        <div className="stat-card">
          <p className="stat-label">Offers</p>
          <h3>{applications.filter(app => app.status === "Offer").length}</h3>
        </div>
      </div>
      <p className="section-title">Your Applications</p>
      <select
      className="filter-select"
      value={filter}
      onChange={(e) => setFilter(e.target.value)}
      >
        <option value="All">All</option>
        <option value="Applied">Applied</option>
        <option value="Interviewing">Interviewing</option>
        <option value="Rejected">Rejected</option>
        <option value="Offer">Offer</option>
      </select>
      <div className="applications-grid">
          {filteredApplications.map((app) => (
            <div className="card" key={app.id}>
              <p><strong>Company:</strong> {app.company}</p>
              <p><strong>Role:</strong> {app.role}</p>
              <p><strong>Location:</strong> {app.location}</p>
              <select value={app.status} onChange={(event) => handleStatusChange(app.id, event.target.value)}>
                <option value="Applied">Applied</option>
                <option value="Interviewing">Interviewing</option>
                <option value="Offer">Offer</option>
                <option value="Rejected">Rejected</option>
              </select>
              <p style={{ color: getStatusColor(app.status), fontWeight: "bold" }}>
                status: {app.status}
              </p>
              <p>Date Applied: {app.date_applied}</p>
              <button onClick={() => handleDelete(app.id)}>Delete</button>
            </div>
          ))}
        </div>
      </div>
  );
}

export default App;