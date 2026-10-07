"""
/analyze and /cv/parse refuse a file over 10 MB (413) or one that isn't a PDF
(415) on the server, before anything reads it. No database: the reading is replaced.
"""
import pytest
from fastapi.testclient import TestClient

import main
from src.cv import upload

PDF = b"%PDF-1.4\n%a small CV\n"


@pytest.fixture
def client(monkeypatch):
    read = []
    monkeypatch.setattr(main.pdf_inspector, "extract_text", lambda path: read.append(path) or "Python, Go")
    monkeypatch.setattr(main, "_cv_parser", lambda: type("P", (), {"parse": lambda self, text: {"skills": ["Python"]}})())
    c = TestClient(main.app, raise_server_exceptions=False)
    c.headers.update({"Origin": "http://localhost:3000"})
    c.read = read
    return c


@pytest.mark.parametrize("path", ["/analyze", "/cv/parse"])
def test_a_file_over_10_mb_is_413_and_never_read(client, path):
    big = PDF + b"0" * upload.MAX_PDF_BYTES
    response = client.post(path, files={"file": ("cv.pdf", big, "application/pdf")})
    assert response.status_code == 413 and response.json() == {"detail": "That file is over 10 MB."}
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert client.read == []


@pytest.mark.parametrize("path", ["/analyze", "/cv/parse"])
def test_a_body_that_says_it_is_too_big_is_refused_before_it_is_read(client, path):
    response = client.post(path, content=b"x", headers={
        "Content-Type": "multipart/form-data; boundary=b",
        "Content-Length": str(upload.MAX_PDF_BYTES + upload.FORM_OVERHEAD + 1)})
    assert response.status_code == 413 and response.json() == {"detail": "That file is over 10 MB."}


@pytest.mark.parametrize("path", ["/analyze", "/cv/parse"])
def test_a_file_that_isnt_a_pdf_is_415_whatever_it_claims(client, path):
    response = client.post(path, files={"file": ("cv.pdf", b"PK\x03\x04 a word file", "application/pdf")})
    assert response.status_code == 415 and response.json() == {"detail": "That isn't a PDF."}
    assert client.read == []


def test_a_pdf_of_exactly_10_mb_is_read(client):
    exact = PDF + b"0" * (upload.MAX_PDF_BYTES - len(PDF))
    response = client.post("/cv/parse", files={"file": ("cv.pdf", exact, "application/pdf")})
    assert response.status_code == 200 and response.json() == {"skills": ["Python"]}
    assert len(client.read) == 1


def test_the_declared_size_allows_the_form_around_the_file():
    assert upload.declared_too_big(str(upload.MAX_PDF_BYTES + upload.FORM_OVERHEAD)) is False
    assert upload.declared_too_big(str(upload.MAX_PDF_BYTES + upload.FORM_OVERHEAD + 1)) is True
    assert upload.declared_too_big(None) is False and upload.declared_too_big("lots") is False
