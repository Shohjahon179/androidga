# Vagon server (PostgreSQL)

Muhit o'zgaruvchilari:
- DATABASE_URL  — Postgres ulanish manzili (postgres://user:pass@host:5432/db)
- API_KEY       — ilovadagi DEFAULT_API_KEY bilan bir xil bo'lishi shart
- PGSSL=disable — faqat lokal Postgres uchun

Lokal sinash:
  cd server && npm install
  DATABASE_URL=postgres://postgres:parol@localhost:5432/vagon API_KEY=kalit PGSSL=disable npm start
  curl -H "X-API-Key: kalit" http://localhost:3000/api/users
