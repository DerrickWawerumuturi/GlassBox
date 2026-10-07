"""
The CV upload's limits, on the server: /analyze and /cv/parse take a PDF of
10 MB or less. The browser checks both before sending (lib/cv-ask.ts,
checkFile); these hold for anything that skips the browser.

    declared_too_big(content_length)   a body that says it is over the limit: refused before it is read
    pdf_bytes(file)                    the upload's bytes, or PdfTooLarge (413) / NotPdf (415)
"""
from fastapi import UploadFile

MAX_PDF_BYTES = 10 * 1024 * 1024
# The multipart wrapping around the file (boundaries, headers, the file name):
# a body this much over the limit can still hold a file under it.
FORM_OVERHEAD = 64 * 1024
# A PDF starts with "%PDF-"; the format lets a little junk come first.
PDF_MAGIC = b"%PDF-"
MAGIC_WITHIN = 1024
PATHS = frozenset({"/analyze", "/cv/parse"})


class PdfTooLarge(Exception):
    def __init__(self):
        super().__init__("That file is over 10 MB.")


class NotPdf(Exception):
    def __init__(self):
        super().__init__("That isn't a PDF.")


def declared_too_big(content_length: str | None) -> bool:
    """Whether the request's Content-Length is past the limit, so it is refused unread."""
    try:
        return int(content_length or 0) > MAX_PDF_BYTES + FORM_OVERHEAD
    except ValueError:
        return False


async def pdf_bytes(file: UploadFile) -> bytes:
    """The uploaded file's bytes: never more than the limit read into memory, and only a PDF."""
    data = await file.read(MAX_PDF_BYTES + 1)
    if len(data) > MAX_PDF_BYTES:
        raise PdfTooLarge()
    if PDF_MAGIC not in data[:MAGIC_WITHIN]:
        raise NotPdf()
    return data
