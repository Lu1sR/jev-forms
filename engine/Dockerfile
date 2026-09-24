# Engine API. Private service on Railway: only the web app talks to it.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# OpenCV (pulled in by RapidOCR) needs these shared libraries.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt requirements-ocr.txt ./
RUN pip install -r requirements.txt -r requirements-ocr.txt

COPY app ./app
COPY cli.py serve.py ./

# Fetch and load the OCR models at build time so the first request is fast.
RUN python -c "from app.readers.ocr import warmup; warmup()"

EXPOSE 8000
# Listens on IPv4 and IPv6 (Railway's private network uses both).
CMD ["python", "serve.py"]
