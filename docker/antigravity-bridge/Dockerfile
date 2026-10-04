FROM python:3.13-alpine
RUN apk add --no-cache docker-cli
WORKDIR /app
COPY docker/antigravity-bridge/server.py /app/server.py
EXPOSE 8787
CMD ["python", "/app/server.py"]
