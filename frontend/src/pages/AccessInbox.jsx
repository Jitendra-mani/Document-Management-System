
import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:5000";

function AccessInbox() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const token = localStorage.getItem("access_token");

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/access/inbox`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load requests");
      }

      setRequests(data.requests || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (requestId, action) => {
    try {
      setError("");
      setMessage("");

      const response = await fetch(`${API_URL}/api/access/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          request_id: requestId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not process request");
      }

      setMessage(data.message);
      await fetchRequests();
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <div className="access-page">
      <div className="access-header">
        <h1>Access Inbox</h1>
        <p>Review document access requests from other divisions.</p>
      </div>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      <div className="inbox-card">
        <div className="inbox-heading">
          <h2>Incoming Requests</h2>
          <button onClick={fetchRequests}>Refresh</button>
        </div>

        {loading && <p>Loading requests...</p>}

        {!loading && requests.length === 0 && (
          <p>No access requests found.</p>
        )}

        {!loading && requests.map((item) => (
          <div className="inbox-request" key={item.request_id}>
            <div className="request-details">
              <h3>Document Access Request</h3>
              <p>
                <strong>Requester:</strong> {item.requester_name}
              </p>
              <p>
                <strong>Requester Division:</strong>{" "}
                {item.requester_division}
              </p>
              <p>
                <strong>Document ID:</strong> {item.doc_id}
              </p>
              <p>
                <strong>Requested On:</strong>{" "}
                {new Date(item.created_at).toLocaleString()}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                <span className={`status ${item.status}`}>
                  {item.status}
                </span>
              </p>
            </div>

            {item.status === "pending" && (
              <div className="request-actions">
                <button
                  className="approve-button"
                  onClick={() =>
                    handleReview(item.request_id, "approve")
                  }
                >
                  Approve
                </button>

                <button
                  className="reject-button"
                  onClick={() =>
                    handleReview(item.request_id, "reject")
                  }
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AccessInbox;
