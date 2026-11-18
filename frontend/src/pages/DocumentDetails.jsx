
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

function DocumentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch(
          `http://127.0.0.1:5000/api/documents/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to fetch document");
        }

        setDocument(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id]);

  if (loading) return <p>Loading document details...</p>;

  if (error) {
    return (
      <div className="details-container">
        <p>{error}</p>
        <button onClick={() => navigate("/")}>Back to Dashboard</button>
      </div>
    );
  }

  if (!document) return <p>Document not found.</p>;

  return (
    <div className="details-container">
      <button onClick={() => navigate("/")}>
        ← Back to Dashboard
      </button>

      <h2>Document Details</h2>

      <div className="details-card">
        <h3>{document.title}</h3>

        <p><strong>Filename:</strong> {document.filename}</p>
        <p><strong>Division:</strong> {document.division}</p>
        <p><strong>Uploaded By:</strong> {document.uploaded_by}</p>
        <p>
          <strong>Uploaded On:</strong>{" "}
          {document.created_at
            ? new Date(document.created_at).toLocaleString()
            : "Not available"}
        </p>

        <h3>Custom Metadata</h3>

        {Object.keys(document.metadata || {}).length > 0 ? (
          Object.entries(document.metadata).map(([key, value]) => (
            <p key={key}>
              <strong>{key.replaceAll("_", " ")}:</strong>{" "}
              {String(value)}
            </p>
          ))
        ) : (
          <p>No metadata available.</p>
        )}

        <h3>Extracted OCR Text</h3>

        <div className="ocr-content">
          {document.ocr_text || "No text was extracted from this document."}
        </div>
      </div>
    </div>
  );
}

export default DocumentDetails;
