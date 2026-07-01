FROM python:3.12-slim AS base
WORKDIR /app

FROM base AS deps
COPY apps/ai-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM deps AS runner
COPY apps/ai-service/ .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
