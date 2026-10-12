FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .

# No torch: MiniLM runs on ONNX Runtime (src/Agent/utils/embedder.py). Torch was
# most of a 588 MB compressed image that every scale-from-zero pulled (GitHub issue #4).
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .
COPY src ./src

# Bake MiniLM into the image: with no cached copy every scale-from-zero
# downloaded it from the HF Hub inside the startup window. The embedder names
# the files and the pinned revision, so the image holds exactly what it reads.
ENV HF_HOME=/opt/hf
ENV HF_HUB_OFFLINE=1
RUN HF_HUB_OFFLINE=0 python -c "from src.Agent.utils.embedder import MODEL_FILES, model_file; [model_file(f) for f in MODEL_FILES]"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
