
import requests
import getpass
import uuid

BASE_URL = "http://127.0.0.1:5000"

print("\n===== TRIAD DMS AUTOMATED TESTING =====\n")

# Enter test account details privately
email_a = input("Division A email: ")
password_a = getpass.getpass("Division A password: ")

email_b = input("Division B email: ")
password_b = getpass.getpass("Division B password: ")

session = requests.Session()


def check(name, condition):
    if condition:
        print(f"PASS: {name}")
    else:
        print(f"FAIL: {name}")


def login(email, password):
    response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password}
    )

    if response.status_code != 200:
        raise Exception(f"Login failed for {email}: {response.text}")

    data = response.json()

    return data["access_token"], data["user"]


try:
    # 1. Login tests
    token_a, user_a = login(email_a, password_a)
    token_b, user_b = login(email_b, password_b)

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    check("Division A login", bool(token_a))
    check("Division B login", bool(token_b))

    check(
        "Division A admin account",
        user_a.get("role") == "admin"
    )

    # 2. Fetch documents
    response_a = session.get(
        f"{BASE_URL}/api/documents",
        headers=headers_a
    )

    response_b = session.get(
        f"{BASE_URL}/api/documents",
        headers=headers_b
    )

    check("Division A document listing", response_a.status_code == 200)
    check("Division B document listing", response_b.status_code == 200)

    docs_a = response_a.json().get("documents", [])
    docs_b = response_b.json().get("documents", [])

    ids_a = {doc["id"] for doc in docs_a}
    ids_b = {doc["id"] for doc in docs_b}

    check(
        "Division-based document isolation",
        ids_a.isdisjoint(ids_b)
    )

    # 3. Metadata retrieval
    response = session.get(
        f"{BASE_URL}/api/metadata",
        headers=headers_a
    )

    check("Metadata retrieval", response.status_code == 200)

    fields = response.json().get("fields", [])

    print("Metadata fields found:", len(fields))

    # 4. Metadata create, update and delete
    field_name = "automated_test_" + uuid.uuid4().hex[:8]

    create_response = session.post(
        f"{BASE_URL}/api/metadata",
        headers=headers_a,
        json={
            "name": field_name,
            "label": "Automated Test Field",
            "type": "text",
            "options": [],
            "required": False
        }
    )

    check("Admin creates metadata field", create_response.status_code == 201)

    if create_response.status_code == 201:
        field_id = create_response.json()["id"]

        update_response = session.put(
            f"{BASE_URL}/api/metadata/{field_id}",
            headers=headers_a,
            json={"label": "Updated Automated Test Field"}
        )

        check("Admin updates metadata field", update_response.status_code == 200)

        delete_response = session.delete(
            f"{BASE_URL}/api/metadata/{field_id}",
            headers=headers_a
        )

        check("Admin deletes metadata field", delete_response.status_code == 200)

    # 5. OCR search
    search_response = session.get(
        f"{BASE_URL}/api/search",
        params={"q": "HEMOSENSE"},
        headers=headers_a
    )

    check("OCR search API", search_response.status_code == 200)

    if search_response.status_code == 200:
        results = search_response.json().get("results", [])
        print("OCR search results:", len(results))

    # 6. Cross-division access workflow
    if not docs_a:
        print("\nSKIP: No Division A document available for access testing.")
    else:
        document = docs_a[0]
        doc_id = document["id"]

        # Request access from Division B
        request_response = session.post(
            f"{BASE_URL}/api/access/request",
            headers=headers_b,
            json={"doc_id": doc_id}
        )

        check(
            "Division B requests access",
            request_response.status_code in [200, 201]
        )

        # Check access inbox in Division A
        inbox_response = session.get(
            f"{BASE_URL}/api/access/inbox",
            headers=headers_a
        )

        check("Division A access inbox", inbox_response.status_code == 200)

        if inbox_response.status_code == 200:
            inbox_data = inbox_response.json()
            access_requests = inbox_data.get("requests", [])

            matching_request = next(
                (
                    item for item in access_requests
                    if item.get("doc_id") == doc_id
                    and item.get("requester_id") == user_b.get("id")
                    and item.get("status") == "pending"
                ),
                None
            )

            if matching_request:
                approve_response = session.post(
                    f"{BASE_URL}/api/access/approve",
                    headers=headers_a,
                    json={"request_id": matching_request["request_id"]}
                )

                check(
                    "Division A approves access",
                    approve_response.status_code == 200
                )

                if approve_response.status_code == 200:
                    download_response = session.get(
                        f"{BASE_URL}/api/documents/{doc_id}/download",
                        headers=headers_b
                    )

                    check(
                        "Division B downloads approved document",
                        download_response.status_code == 200
                    )
            else:
                print(
                    "SKIP: No matching pending request found. "
                    "A request may already exist or have been reviewed."
                )

    print("\n===== TESTING COMPLETED =====")

except Exception as error:
    print("\nTESTING ERROR:", error)
