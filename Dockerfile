# ── EnergyBot Backend — FastAPI ──────────────────────────────────────────────
FROM python:3.10-slim

WORKDIR /app

# OS packages needed for some Python dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
 && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download embedding model so the container works fully offline
ENV HF_HOME=/app/hf_cache
ENV SENTENCE_TRANSFORMERS_HOME=/app/hf_cache
RUN python -c "\
from sentence_transformers import SentenceTransformer; \
SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'); \
print('Embedding model cached.')"

# Copy application source
COPY . .

EXPOSE 8000
CMD ["uvicorn", "fastapi_server:app", "--host", "0.0.0.0", "--port", "8000"]
