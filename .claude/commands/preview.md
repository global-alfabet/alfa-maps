Build and run the production website and app in Docker so I can check them.

1. Run `docker compose up -d --build`.
2. Wait for both to start and confirm http://localhost:8081 (website) and http://localhost:8080/api/health (app) respond.
3. Tell me both URLs and how to stop them (`docker compose down`).
