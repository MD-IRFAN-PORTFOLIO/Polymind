import csv
import io
from pathlib import Path
from typing import Any


def parse_and_chunk_file(
    file_bytes: bytes,
    filename: str,
    chunk_size: int = 800,
    chunk_overlap: int = 100,
) -> list[dict[str, Any]]:
    """Parse raw uploaded file bytes into semantic text chunks with metadata."""
    suffix = Path(filename).suffix.lower()
    text = ""
    page_chunks: list[dict[str, Any]] = []

    if suffix in [".txt", ".md", ".markdown", ".json", ".py", ".ts", ".js", ".html"]:
        text = file_bytes.decode("utf-8", errors="replace")
    elif suffix == ".csv":
        try:
            reader = csv.reader(io.StringIO(file_bytes.decode("utf-8", errors="replace")))
            rows = [", ".join(row) for row in reader if any(cell.strip() for cell in row)]
            text = "\n".join(rows)
        except Exception:
            text = file_bytes.decode("utf-8", errors="replace")
    elif suffix == ".pdf":
        # Extract text using PyPDF or fallback to pure text stream
        text = _extract_pdf_text(file_bytes)
    else:
        text = file_bytes.decode("utf-8", errors="replace")

    raw_chunks = split_text_recursive(text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    for idx, chunk_str in enumerate(raw_chunks):
        page_chunks.append(
            {
                "chunk_index": idx,
                "content": chunk_str,
                "meta_info": {
                    "filename": filename,
                    "chunk_index": idx,
                    "char_count": len(chunk_str),
                },
            }
        )

    return page_chunks


def _extract_pdf_text(file_bytes: bytes) -> str:
    """Extract plain text from PDF bytes without requiring heavy native libraries."""
    lines: list[str] = []
    # Simple stream parser to pull text objects from uncompressed/standard PDF streams
    try:
        content = file_bytes.decode("latin-1")
        import re

        # Match text between BT (Begin Text) and ET (End Text)
        text_blocks = re.findall(r"BT(.*?)ET", content, re.DOTALL)
        for block in text_blocks:
            matches = re.findall(r"\((.*?)\)\s*Tj", block)
            if matches:
                lines.append(" ".join(matches))
    except Exception:
        pass
    if lines:
        return "\n".join(lines)
    return file_bytes.decode("utf-8", errors="replace")


def split_text_recursive(text: str, chunk_size: int = 800, chunk_overlap: int = 100) -> list[str]:
    """Split text recursively by paragraph, then line, then word."""
    text = text.strip()
    if not text:
        return []
    if len(text) <= chunk_size:
        return [text]

    separators = ["\n\n", "\n", ". ", " "]
    chunks: list[str] = []

    def _split(subtext: str, sep_idx: int) -> list[str]:
        if len(subtext) <= chunk_size:
            return [subtext] if subtext.strip() else []
        if sep_idx >= len(separators):
            # Hard character split
            return [subtext[i : i + chunk_size] for i in range(0, len(subtext), chunk_size - chunk_overlap)]

        sep = separators[sep_idx]
        parts = subtext.split(sep)
        out: list[str] = []
        current = ""

        for part in parts:
            candidate = f"{current}{sep}{part}" if current else part
            if len(candidate) <= chunk_size:
                current = candidate
            else:
                if current.strip():
                    out.append(current.strip())
                if len(part) > chunk_size:
                    out.extend(_split(part, sep_idx + 1))
                    current = ""
                else:
                    current = part

        if current.strip():
            out.append(current.strip())
        return out

    return _split(text, 0)
