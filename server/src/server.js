require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 5000;
const jwtSecret = process.env.JWT_SECRET;
console.log("JWT_SECRET:", jwtSecret);

app.use(cors());
app.use(express.json());

const databasePath = path.join(__dirname, "..", "applications.db");
const database = new sqlite3.Database(databasePath);


database.serialize(() => {
  database.run(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Applied',
      location TEXT,
      salary TEXT,
      job_link TEXT,
      date_applied TEXT,
      description TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  database.run(
    `ALTER TABLE applications ADD COLUMN user_id INTEGER`,
    (error) => {
      if (error && !error.message.includes("duplicate column name")) {
        console.error("Error adding user_id column:", error.message);
      }
    }
  );
  
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `);
});

function authenticateToken(request, response, next) {
  const authHeader = request.headers["authorization"];

  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return response.status(401).json({
      error: "Access token required"
    });
  }

  jwt.verify(token, jwtSecret, (error, user) => {
    if (error) {
      return response.status(403).json({
        error: "Invalid or expired token"
      });
    }

    request.user = user;
    next();
  });
}

app.post("/api/register", async (request, response) => {
  const { username, email, password } = request.body;

  if (!username || !email || !password) {
    return response.status(400).json({
      error: "Username, email, and password are required"
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    database.run(
      `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`,
      [username, email, hashedPassword],
      function (error) {
        if (error) {
          if (
            error.message.includes("users.username") ||
            error.message.includes("users.email")
          ) {
            return response.status(400).json({
              error: "Username or email already exists"
            });
          }

          return response.status(500).json({
            error: "Failed to register user"
          });
        }

        response.status(201).json({
          message: "User registered successfully",
          userId: this.lastID
        });
      }
    );
  } catch (error) {
    response.status(500).json({
      error: "Server error while registering user"
    });
  }
});

app.post("/api/login", (request, response) => {
  const { email, password } = request.body;

  if (!email || !password) {
    return response.status(400).json({
      error: "Email and password are required"
    });
  }

  database.get(
    `SELECT * FROM users WHERE email = ?`,
    [email],
    async (error, user) => {
      if (error) {
        console.error("Database error during login:", error);
        return response.status(500).json({
          error: "Server error while logging in"
        });
      }

      if (!user) {
        return response.status(401).json({
          error: "Invalid email or password"
        });
      }

      try {
        console.log("User found:", user);
        console.log("JWT secret exists:", !!jwtSecret);

        const passwordMatches = await bcrypt.compare(password, user.password);

        if (!passwordMatches) {
          return response.status(401).json({
            error: "Invalid email or password"
          });
        }

        const token = jwt.sign(
          {
            id: user.id,
            email: user.email,
            username: user.username
          },
          jwtSecret,
          { expiresIn: "1h" }
        );

        return response.status(200).json({
          message: "Login successful",
          token
        });
      } catch (loginError) {
        console.error("Login route error:", loginError);
        return response.status(500).json({
          error: "Server error during login"
        });
      }
    }
  );
});

app.get("/api/health", (request, response) => {
  response.json({ message: "Server is running" });
});

app.get("/api/applications", authenticateToken, (request, response) => {
  const userId = request.user.id;

  const query = `
    SELECT *
    FROM applications
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;

  database.all(query, [userId], (error, rows) => {
    if (error) {
      return response.status(500).json({ error: "Failed to fetch applications" });
    }

    response.json(rows);
  });
});

app.delete("/api/applications/:id", authenticateToken, (request, response) => {
  const applicationId = request.params.id;
  const userId = request.user.id;

  database.run(
    "DELETE FROM applications WHERE id = ? AND user_id = ?",
    [applicationId, userId],
    function (error) {
      if (error) {
        return response.status(500).json({
          error: "Failed to delete application"
        });
      }

      if (this.changes === 0) {
        return response.status(404).json({
          error: "Application not found or not authorized"
        });
      }

      response.json({ message: "Application deleted successfully" });
    }
  );
});

app.post("/api/applications", authenticateToken, (request, response) => {
  console.log("POST /api/applications hit by user:", request.user);

  const userId = request.user.id;

  const {
    company,
    role,
    status,
    location,
    salary,
    jobLink,
    dateApplied,
    description,
    notes
  } = request.body;

  const query = `
  INSERT INTO applications (
    company,
    role,
    status,
    location,
    salary,
    job_link,
    date_applied,
    description,
    notes,
    user_id
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

  const values = [
    company,
    role,
    status || "Applied",
    location || "",
    salary || "",
    jobLink || "",
    dateApplied || "",
    description || "",
    notes || "",
    userId
  ];

  database.run(query, values, function (error) {
    if (error) {
      return response.status(500).json({ error: "Failed to create application" });
    }

    database.get(
      "SELECT * FROM applications WHERE id = ?",
      [this.lastID],
      (fetchError, row) => {
        if (fetchError) {
          return response.status(500).json({ error: "Application created but failed to fetch it" });
        }

        response.status(201).json(row);
      }
    );
  });
});

app.put("/api/applications/:id", authenticateToken, (request, response) => {
  const applicationId = request.params.id;
  const userId = request.user.id;
  const { status } = request.body;

  database.run(
    "UPDATE applications SET status = ? WHERE id = ? AND user_id = ?",
    [status, applicationId, userId],
    function (error) {
      if (error) {
        return response.status(500).json({
          error: "Failed to update"
        });
      }

      if (this.changes === 0) {
        return response.status(404).json({
          error: "Application not found or not authorized"
        });
      }

      response.status(200).json({
        message: "Application updated successfully"
      });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});