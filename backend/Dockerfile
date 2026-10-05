FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .

# CPU-only PyTorch
RUN pip install --no-cache-dir \
    torch \
    --index-url https://download.pytorch.org/whl/cpu

# Remaining application dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Bake MiniLM into the image. embedder.py:34 builds SentenceTransformer at import
# time, so with no cached copy every scale-from-zero downloaded it from the HF Hub
# inside the startup window, before uvicorn could bind the port.
ENV HF_HOME=/opt/hf
ENV HF_HUB_OFFLINE=1
RUN HF_HUB_OFFLINE=0 python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

COPY main.py .
COPY src ./src

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]