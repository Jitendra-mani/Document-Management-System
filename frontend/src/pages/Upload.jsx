
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = "http://127.0.0.1:5000";

function Upload() {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [fields, setFields] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    const fetchFields = async () => {
      try {
        const response = await fetch(`${API_URL}/api/metadata`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load metadata");
        }

        const definitions = Array.isArray(data)
          ? data
          : data.fields || [];

        setFields(definitions);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchFields();
  }, [token]);

  const handleMetadataChange = (name, value) => {
    setMetadata((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!file) {
      setError("Please select a PDF or image.");
      return;
    }

    const formData = new FormData();

    formData.append("title", title);
    formData.append("file", file);
    formData.append("metadata", JSON.stringify(metadata));

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/documents/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Upload failed");
      }

      setMessage("Document uploaded successfully!");

      setTitle("");
      setFile(null);
      setMetadata({});

      e.target.reset();

      setTimeout(() => {
        navigate("/dashboard");
      }, 1200);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-page">
      <div className="upload-card">
        <h1>Upload Document</h1>
        <p>Add a document to your division workspace.</p>

        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleUpload}>
          <label>Document Title</label>

          <input
            type="text"
            placeholder="Enter document title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <label>Select Document</label>

          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => setFile(e.target.files[0])}
            required
          />

          <h3>Document Metadata</h3>

          {fields.map((field) => (
            <div key={field._id || field.name}>
              <label>
                {field.label}
                {field.required ? " *" : ""}
              </label>

              {field.type === "text" && (
                <input
                  type="text"
                  required={field.required}
                  value={metadata[field.name] || ""}
                  onChange={(e) =>
                    handleMetadataChange(field.name, e.target.value)
                  }
                />
              )}

              {field.type === "number" && (
                <input
                  type="number"
                  required={field.required}
                  value={metadata[field.name] ?? ""}
                  onChange={(e) =>
                    handleMetadataChange(
                      field.name,
                      e.target.value === ""
                        ? ""
                        : Number(e.target.value)
                    )
                  }
                />
              )}

              {field.type === "date" && (
                <input
                  type="date"
                  required={field.required}
                  value={metadata[field.name] || ""}
                  onChange={(e) =>
                    handleMetadataChange(field.name, e.target.value)
                  }
                />
              )}

              {field.type === "dropdown" && (
                <select
                  required={field.required}
                  value={metadata[field.name] || ""}
                  onChange={(e) =>
                    handleMetadataChange(field.name, e.target.value)
                  }
                >
                  <option value="">Select an option</option>

                  {(field.options || []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}

              {field.type === "checkbox" && (
                <input
                  type="checkbox"
                  checked={metadata[field.name] || false}
                  onChange={(e) =>
                    handleMetadataChange(field.name, e.target.checked)
                  }
                />
              )}
            </div>
          ))}

          <button type="submit" disabled={loading}>
            {loading ? "Uploading..." : "Upload Document"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Upload;
