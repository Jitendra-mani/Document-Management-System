
import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";

import "./App.css";
import Upload from "./pages/Upload";
import AccessRequest from "./pages/AccessRequest";
import AccessInbox from "./pages/AccessInbox";
import DocumentDetails from "./pages/DocumentDetails";
import MetadataManagement from "./pages/MetadataManagement";

const API_URL = "http://127.0.0.1:5000";

// ================= LOGIN PAGE =================

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="brand">
          <div className="brand-icon">D</div>
          <h2>DocuFlow</h2>
        </div>

        <h1>Welcome back</h1>

        <p className="subtitle">
          Sign in to access your document workspace.
        </p>

        <form onSubmit={handleLogin}>
          <label>Email address</label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="error-message">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="footer-text">
          Secure document management for your organization.
        </p>
      </div>
    </div>
  );
}

// ================= DASHBOARD =================

function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("access_token");

  // Fetch documents from Flask backend
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/documents`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load documents");
      }

      setDocuments(data.documents || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Search documents using OCR backend API
  const searchDocuments = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Search failed");
      }

      setSearchResults(data.results || []);
    } catch (err) {
      setError(err.message);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [token]);

  // Search after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      searchDocuments(search);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  // Logout
  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    navigate("/");
  };

  // Download document
  const handleDownload = async (doc) => {
    try {
      const response = await fetch(
        `${API_URL}/api/documents/${doc.id}/download`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        let message = "Download failed";

        try {
          const data = await response.json();
          message = data.message || message;
        } catch {
          // Keep default error message
        }

        throw new Error(message);
      }

      const blob = await response.blob();

      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = doc.filename || "document";

      document.body.appendChild(link);
      link.click();

      link.remove();

      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert(err.message);
    }
  };

  // Copy document ID
  const copyDocumentId = (id) => {
    navigator.clipboard.writeText(id);
    alert("Document ID copied!");
  };

  // Choose normal documents or OCR search results
  const filteredDocuments = search.trim()
    ? searchResults
    : documents;

  return (
    <div className="dashboard-layout">

      {/* SIDEBAR */}

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">D</div>
          <h2>DocuFlow</h2>
        </div>

        <p className="nav-heading">WORKSPACE</p>

        <div
          className="nav-item active"
          onClick={() => navigate("/dashboard")}
        >
          <span>▣</span> Documents
        </div>

        <div
          className="nav-item"
          onClick={() => navigate("/upload")}
        >
          <span>⇧</span> Upload Documents
        </div>

        <div
          className="nav-item"
          onClick={() => document.getElementById("document-search")?.focus()}
        >
          <span>⌕</span> Search
        </div>

        <div
          className="nav-item"
          onClick={() => navigate("/access-request")}
        >
          <span>🔐</span> Request Access
        </div>

        <div
          className="nav-item"
          onClick={() => navigate("/access-inbox")}
        >
          <span>📥</span> Access Inbox
        </div>
        {user.role === "admin" && (
        <div
          className="nav-item"
          onClick={() => navigate("/metadata-management")}
        >
          <span>⚙️</span> Metadata Management
        </div>
        )}

        <div className="sidebar-bottom">
          <button className="logout-button" onClick={logout}>
            ↪ Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}

      <main className="dashboard-main">

        {/* TOP BAR */}

        <header className="topbar">
          <div>
            <h2>Document Hub</h2>
            <p>
              Manage and access your organization's documents.
            </p>
          </div>

          <div className="user-info">
            <div className="avatar">
              {(user.name || user.email || "U")[0].toUpperCase()}
            </div>

            <div>
              <strong>{user.name || user.email || "User"}</strong>
              <p>{user.division || "Division"}</p>
            </div>
          </div>
        </header>

        {/* DASHBOARD */}

        <section className="dashboard-content">

          <div className="welcome-section">
            <div>
              <h1>Welcome to your workspace</h1>
              <p>Here is an overview of your documents.</p>
            </div>
          </div>

          {/* STATISTICS */}

          <div className="stats-grid">

            <div className="stat-card">
              <p>Total Documents</p>
              <h2>{documents.length}</h2>
              <span>Documents in your division</span>
            </div>

            <div className="stat-card">
              <p>Your Division</p>
              <h2>{user.division || "Not available"}</h2>
              <span>Assigned workspace</span>
            </div>

          </div>

          {/* DOCUMENT TABLE */}

          <section className="documents-section">

            <div className="section-header">
              <div>
                <h2>
                  {search.trim() ? "Search Results" : "Recent Documents"}
                </h2>

                <p>
                  {search.trim()
                    ? "Results from document titles, filenames and OCR text"
                    : "Documents available in your division"}
                </p>
              </div>
            </div>

            {/* SEARCH INPUT */}

            <input
              id="document-search"
              className="search-input"
              type="text"
              placeholder="Search by title, filename or document content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {searching && <p>Searching documents...</p>}

            {loading && <p>Loading documents...</p>}

            {error && (
              <p className="error-message">{error}</p>
            )}

            {!loading &&
              !searching &&
              !error &&
              filteredDocuments.length === 0 && (
                <div className="empty-state">
                  <h3>No documents found</h3>
                  <p>
                    {search.trim()
                      ? "Try another search term."
                      : "Upload a document to get started."}
                  </p>
                </div>
              )}

            {!loading &&
              !searching &&
              !error &&
              filteredDocuments.length > 0 && (

                <div className="table-wrapper">

                  <table>
                    <thead>
                      <tr>
                        <th>Document</th>
                        <th>Division</th>
                        <th>Category</th>
                        <th>Uploaded Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredDocuments.map((doc) => (

                        <tr key={doc.id}>

                          <td>
                            <strong>{doc.title}</strong>

                            <p className="file-name">
                              {doc.filename}
                            </p>

                            <p className="document-id">
                              ID: {doc.id}

                              <button
                                className="copy-id-button"
                                onClick={() => copyDocumentId(doc.id)}
                              >
                                Copy ID
                              </button>
                            </p>
                          </td>

                          <td>{doc.division}</td>

                          <td>
                            {doc.metadata?.document_type || "—"}
                          </td>

                          <td>
                            {doc.created_at
                              ? new Date(doc.created_at).toLocaleDateString()
                              : "—"}
                          </td>

                          <td>
                          <button
                              className="download-button"
                              onClick={() => navigate(`/documents/${doc.id}`)}
                          >
                          View Details
                          </button>

                          <button
                            className="download-button"
                            onClick={() => handleDownload(doc)}
                          >
                            Download
                          </button>
                        </td>

                        </tr>

                      ))}
                    </tbody>
                  </table>

                </div>

              )}

          </section>

        </section>
      </main>
    </div>
  );
}

// ================= PROTECTED ROUTE =================

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("access_token");

  return token ? children : <Navigate to="/" replace />;
}

// ================= MAIN APP =================

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={<Login />}
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <Upload />
            </ProtectedRoute>
          }
        />

        <Route
          path="/access-request"
          element={
            <ProtectedRoute>
              <AccessRequest />
            </ProtectedRoute>
          }
        />

        <Route
          path="/access-inbox"
          element={
            <ProtectedRoute>
              <AccessInbox />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents/:id"
          element={
            <ProtectedRoute>
              <DocumentDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/metadata-management"
          element={
            <ProtectedRoute>
              <MetadataManagement />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
