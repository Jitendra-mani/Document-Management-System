# Document Management System (DMS)

A division-based Document Management System built using **React, Python Flask, and MongoDB**. The application provides secure document storage, dynamic metadata management, OCR-powered content search, and controlled cross-division document access.

## Project Overview

The Document Management System (DMS) helps organizations manage documents across different divisions while maintaining data security and access control.

Users can upload and manage documents within their own divisions. If a user needs to access a document belonging to another division, they must submit an access request. The document owner's division can approve or reject the request.

The system also extracts text from uploaded PDFs and images using Optical Character Recognition (OCR), allowing users to search documents based on their content.

## Features

### 1. User Authentication
- User registration and login.
- Password hashing for secure storage.
- JWT-based authentication.
- Division-based user identification.

### 2. Document Management
- Upload PDF and image files.
- Store documents using MongoDB GridFS.
- View document details.
- Download authorized documents.
- Automatically associate uploaded documents with the user's division.

### 3. Dynamic Metadata Management
- Create custom metadata fields.
- Edit metadata field names and configurations.
- Delete metadata fields.
- Support text, number, date, dropdown, and checkbox fields.
- Validate metadata dynamically during document uploads.

### 4. Division-Based Access Control
- Users can access documents belonging to their own division.
- Cross-division access requires an approval request.
- Document owners can approve or reject requests.
- Only approved users can download restricted documents.

### 5. OCR and Advanced Search
- Extract text from PDF and image documents.
- Store extracted text in MongoDB.
- Search documents using titles, filenames, and extracted content.
- Display search results based on the user's division.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React.js, HTML, CSS, JavaScript |
| Build Tool | Vite |
| Backend | Python, Flask |
| Database | MongoDB Atlas |
| File Storage | MongoDB GridFS |
| Authentication | JWT |
| Password Security | Werkzeug Password Hashing |
| OCR | Tesseract OCR, PyMuPDF, Pytesseract |
| API Testing | Thunder Client, Python Requests |
| Version Control | Git and GitHub |

## System Architecture

```text
              React Frontend
                    |
                    | REST API Requests
                    |
              Flask Backend
                    |
       +------------+------------+
       |            |            |
   Authentication Documents   Metadata
       |            |            |
       +------------+------------+
                    |
             Access Control
                    |
          MongoDB Atlas Database
                    |
              MongoDB GridFS
                    |
              Document Files

       OCR Processing and Search
                    |
          Extracted Text Storage
                    |
             Search API
```

## Project Structure

```text
triad-dms/
│
├── backend/
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── documents.py
│   │   ├── access.py
│   │   ├── metadata.py
│   │   └── search.py
│   │
│   ├── services/
│   │   └── ocr_service.py
│   │
│   ├── app.py
│   ├── config.py
│   ├── requirements.txt
│   ├── test_dms.py
│   └── test_mongo.py
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Upload.jsx
│   │   │   ├── AccessRequest.jsx
│   │   │   ├── AccessInbox.jsx
│   │   │   ├── DocumentDetails.jsx
│   │   │   └── MetadataManagement.jsx
│   │   │
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
└── .gitignore
```

## Installation and Setup

### Prerequisites

Make sure the following are installed:

- Python 3.10 or later
- Node.js and npm
- MongoDB Atlas account
- Git
- Tesseract OCR

### 1. Clone the Repository

```bash
git clone https://github.com/Jitendra-mani/Document-Management-System.git
cd Document-Management-System
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment on Windows:

```powershell
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file inside the backend directory:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET_KEY=your_secure_random_secret
```

Configure your MongoDB Atlas connection string and JWT secret. Never commit this file to GitHub.

If using Windows, install Tesseract OCR and configure its executable path in `services/ocr_service.py` if necessary.

Start the Flask backend:

```bash
python app.py
```

The backend runs at:

```text
http://127.0.0.1:5000
```

### 3. Frontend Setup

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the React development server:

```bash
npm run dev
```

Open the local URL displayed by Vite in your browser.

## API Endpoints

All protected endpoints require a JWT bearer token.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Authenticate a user |

### Documents

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/documents/upload` | Upload a document |
| GET | `/api/documents` | Retrieve division-specific documents |
| GET | `/api/documents/<doc_id>` | Retrieve document details |
| GET | `/api/documents/<doc_id>/download` | Download an authorized document |

### Access Management

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/access/request` | Request cross-division access |
| GET | `/api/access/inbox` | View incoming access requests |
| POST | `/api/access/approve` | Approve an access request |
| POST | `/api/access/reject` | Reject an access request |

### Metadata Management

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/metadata` | Retrieve metadata fields |
| POST | `/api/metadata` | Create a metadata field |
| PUT | `/api/metadata/<field_id>` | Update a metadata field |
| DELETE | `/api/metadata/<field_id>` | Delete a metadata field |

### Search

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/search?q=<query>` | Search documents by title, filename, or OCR content |

## Testing

The project includes automated API testing using Python Requests.

Run the test script from the backend directory:

```bash
python test_dms.py
```

The test script checks important workflows, including:

- User authentication.
- Division-based document isolation.
- Metadata creation, editing, and deletion.
- OCR-based document search.
- Cross-division access requests.
- Access approval and document downloads.

Additional API testing can be performed using Thunder Client in Visual Studio Code.

## Security Considerations

- Passwords are stored using secure password hashing.
- JWT authentication protects restricted API endpoints.
- Documents are filtered according to user divisions.
- Cross-division access requires approval.
- Environment variables are used for sensitive configuration.
- Unauthorized document downloads are restricted.

## Future Enhancements

- Role-based administrative dashboard.
- Document version control.
- Audit logs for document activities.
- Improved OCR support for multiple languages.
- Cloud deployment and production monitoring.
- Pagination for large document collections.

## Author

**Jitendra Mani**

GitHub: [Jitendra-mani](https://github.com/Jitendra-mani)

## Repository

[Document Management System – GitHub](https://github.com/Jitendra-mani/Document-Management-System)
