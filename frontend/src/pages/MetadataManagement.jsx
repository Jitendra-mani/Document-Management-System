
import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:5000";

function MetadataManagement() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [editingId, setEditingId] = useState(null);

  const emptyForm = {
    name: "",
    label: "",
    type: "text",
    options: "",
    required: false,
  };

  const [form, setForm] = useState(emptyForm);

  const token = localStorage.getItem("access_token");

  // Fetch metadata fields
  const fetchFields = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/metadata`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Could not load fields");
      }

      setFields(data.fields || []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  // Handle form inputs
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Create or update metadata field
  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    const payload = {
      label: form.label,
      type: form.type,
      options:
        form.type === "dropdown"
          ? form.options.split(",").map((item) => item.trim()).filter(Boolean)
          : [],
      required: form.required,
    };

    if (!editingId) {
      payload.name = form.name;
    }

    try {
      const response = await fetch(
        editingId
          ? `${API_URL}/api/metadata/${editingId}`
          : `${API_URL}/api/metadata`,
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Operation failed");
      }

      setMessage(data.message || "Metadata saved successfully");
      setForm(emptyForm);
      setEditingId(null);

      await fetchFields();
    } catch (err) {
      setError(err.message);
    }
  };

  // Load field into form for editing
  const handleEdit = (field) => {
    setEditingId(field.id);

    setForm({
      name: field.name,
      label: field.label,
      type: field.type,
      options: (field.options || []).join(", "),
      required: field.required,
    });

    setMessage("");
    setError("");
  };

  // Cancel editing
  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setMessage("");
  };

  // Delete metadata field
  const handleDelete = async (fieldId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this metadata field?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_URL}/api/metadata/${fieldId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Delete failed");
      }

      setMessage(data.message || "Metadata field deleted");

      if (editingId === fieldId) {
        handleCancel();
      }

      await fetchFields();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="metadata-page">
      <div className="metadata-header">
        <div>
          <h1>Metadata Management</h1>
          <p>Create and manage custom document fields.</p>
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      <div className="metadata-card">
        <h2>{editingId ? "Edit Metadata Field" : "Create Metadata Field"}</h2>

        <form onSubmit={handleSubmit}>
          {!editingId && (
            <>
              <label>Field Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Example: document_type"
                required
              />
            </>
          )}

          <label>Display Label</label>
          <input
            name="label"
            value={form.label}
            onChange={handleChange}
            placeholder="Example: Document Category"
            required
          />

          <label>Field Type</label>
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="dropdown">Dropdown</option>
            <option value="checkbox">Checkbox</option>
          </select>

          {form.type === "dropdown" && (
            <>
              <label>Dropdown Options</label>
              <input
                name="options"
                value={form.options}
                onChange={handleChange}
                placeholder="Financial, Legal, Technical, Other"
                required
              />
              <small>Separate options using commas.</small>
            </>
          )}

          <label className="required-checkbox">
            <input
              type="checkbox"
              name="required"
              checked={form.required}
              onChange={handleChange}
            />
            Required field
          </label>

          <div className="metadata-form-actions">
            <button type="submit">
              {editingId ? "Update Field" : "Create Field"}
            </button>

            {editingId && (
              <button type="button" onClick={handleCancel}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="metadata-card">
        <h2>Existing Metadata Fields</h2>

        {loading ? (
          <p>Loading metadata fields...</p>
        ) : fields.length === 0 ? (
          <p>No metadata fields created yet.</p>
        ) : (
          <div className="metadata-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Field Name</th>
                  <th>Label</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Options</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {fields.map((field) => (
                  <tr key={field.id}>
                    <td>{field.name}</td>
                    <td>{field.label}</td>
                    <td>{field.type}</td>
                    <td>{field.required ? "Yes" : "No"}</td>
                    <td>{(field.options || []).join(", ") || "—"}</td>
                    <td>
                      <button onClick={() => handleEdit(field)}>
                        Edit
                      </button>

                      <button onClick={() => handleDelete(field.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default MetadataManagement;
