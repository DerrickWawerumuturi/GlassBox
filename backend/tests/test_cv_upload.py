"""
/analyze and /cv/parse refuse a file over 10 MB (413) or one that isn't a PDF
(415) on the server, before anything reads it. No database: the reading is replaced.
"""
import pytest
import logging
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


def test_an_image_only_pdf_returns_actionable_error_and_correlation_id(client, monkeypatch):
    monkeypatch.setattr(main.pdf_inspector, "extract_text", lambda path: "   ")
    request_id = "a" * 32
    response = client.post("/cv/parse", files={"file": ("scan.pdf", PDF, "application/pdf")},
                           headers={"X-Request-ID": request_id})
    assert response.status_code == 422
    assert "OCR" in response.json()["detail"]
    assert response.headers["X-Request-ID"] == request_id


def test_malformed_pdf_is_reported_as_unreadable_not_server_failure(client, monkeypatch):
    def malformed(_path):
        raise ValueError("private parser detail")
    monkeypatch.setattr(main.pdf_inspector, "extract_text", malformed)
    response = client.post("/cv/parse", files={"file": ("broken.pdf", PDF, "application/pdf")})
    assert response.status_code == 422
    assert "private parser detail" not in response.text


def test_groq_failure_logs_stage_without_exception_details(client, monkeypatch, caplog):
    class BrokenParser:
        def parse(self, _text):
            raise RuntimeError("PRIVATE_CV_OR_PROVIDER_DETAIL")
    monkeypatch.setattr(main, "_cv_parser", lambda: BrokenParser())
    with caplog.at_level(logging.INFO, logger="glassbox.cv"):
        response = client.post("/cv/parse", files={"file": ("cv.pdf", PDF, "application/pdf")})
    assert response.status_code == 500
    assert response.json() == {"detail": "Something went wrong on our side. Please try again."}
    logs = "\n".join(record.getMessage() for record in caplog.records)
    assert '"stage": "groq_profile_parse"' in logs
    assert '"request_id":' in logs
    assert "PRIVATE_CV_OR_PROVIDER_DETAIL" not in logs
    assert "cv.pdf" not in logs


def test_successful_scan_logs_pipeline_and_returns_result(client, monkeypatch, caplog):
    class Agent:
        def parse(self, _text):
            return {"skills": ["Python"]}
        def match(self, _query, _preferences):
            return {"market": {"jobs_analyzed": 3}}
    monkeypatch.setattr(main, "_agent", lambda: Agent())
    request_id = "b" * 32
    with caplog.at_level(logging.INFO, logger="glassbox.cv"):
        response = client.post("/analyze", files={"file": ("cv.pdf", PDF, "application/pdf")},
                               headers={"X-Request-ID": request_id})
    assert response.status_code == 200
    assert response.json() == {"market": {"jobs_analyzed": 3}}
    assert response.headers["X-Request-ID"] == request_id
    stages = [record.getMessage() for record in caplog.records if '"event": "cv_pipeline"' in record.getMessage()]
    assert any('"stage": "upload_validation"' in line for line in stages)
    assert any('"stage": "pdf_extraction"' in line for line in stages)
    assert any('"stage": "groq_profile_parse"' in line for line in stages)
    assert any('"stage": "matching"' in line for line in stages)
    assert all('"duration_ms":' in line for line in stages)
