
import { useState } from "react";

const API_URL = "http://127.0.0.1:5000";

function AccessRequest() {
  const [docId, setDocId] = useState("");
  const [downloadId, setDownloadId] = useState("");

  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token = localStorage.getItem("access_token");

  // Submit access request
  const handleRequest = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/access/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          doc_id: docId.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Request failed");
      }

      setMessage(data.message || "Access request submitted successfully.");
      setDocId("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Download approved document
  const handleDownload = async (e) => {
    e.preventDefault();

    setDownloading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/documents/${downloadId.trim()}/download`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.message || "Download failed. Check whether access is approved."
        );
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "requested-document";
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      setMessage("Document downloaded successfully!");
      setDownloadId("");
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="access-page">
      <div className="access-header">
        <h1>Document Access</h1>
        <p>
          Request permission and download documents from other divisions.
        </p>
      </div>

      {/* Request Access */}
      <div className="access-card">
        <h2>New Access Request</h2>

        <form onSubmit={handleRequest}>
          <label htmlFor="docId">Document ID</label>

          <input
            id="docId"
            type="text"
            placeholder="Enter the document ID"
            value={docId}
            onChange={(e) => setDocId(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>

      {/* Download Approved Document */}
      <div className="access-card">
        <h2>Download Approved Document</h2>

        <p>
          Enter the document ID after your access request has been approved.
        </p>

        <form onSubmit={handleDownload}>
          <label htmlFor="downloadId">Document ID</label>

          <input
            id="downloadId"
            type="text"
            placeholder="Enter approved document ID"
            value={downloadId}
            onChange={(e) => setDownloadId(e.target.value)}
            required
          />

          <button type="submit" disabled={downloading}>
            {downloading ? "Downloading..." : "Download Document"}
          </button>
        </form>
      </div>

      {/* Messages */}
      {message && (
        <p className="success-message">{message}</p>
      )}

      {error && (
        <p className="error-message">{error}</p>
      )}
    </div>
  );
}

export default AccessRequest;
