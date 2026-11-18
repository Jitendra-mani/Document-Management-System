
import io
import os
import fitz
import pytesseract

from PIL import Image


# Windows Tesseract installation path
pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)


def extract_text_from_file(file_bytes, filename):
    extension = filename.rsplit(".", 1)[-1].lower()

    try:
        # Extract text from PDF
        if extension == "pdf":
            return extract_pdf_text(file_bytes)

        # Extract text from images
        elif extension in ["png", "jpg", "jpeg"]:
            return extract_image_text(file_bytes)

        return ""

    except Exception as e:
        print("OCR Error:", str(e))
        return ""


def extract_pdf_text(file_bytes):
    extracted_text = []

    pdf_document = fitz.open(
        stream=file_bytes,
        filetype="pdf"
    )

    for page in pdf_document:
        # First try normal PDF text extraction
        page_text = page.get_text("text").strip()

        # If no selectable text exists, use OCR
        if not page_text:
            pix = page.get_pixmap(dpi=200)
            image_bytes = pix.tobytes("png")

            image = Image.open(io.BytesIO(image_bytes))
            page_text = pytesseract.image_to_string(image)

        extracted_text.append(page_text)

    pdf_document.close()

    return "\n".join(extracted_text).strip()


def extract_image_text(file_bytes):
    image = Image.open(io.BytesIO(file_bytes))
    return pytesseract.image_to_string(image).strip()
