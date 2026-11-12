# Imagen mínima para el servicio de cron "enrollment-sync": solo necesita Prisma Client y los
# scripts, no la app de Next.js completa (evita el build de next build, que no hace falta aquí).
FROM node:20-slim
WORKDIR /app
# Sin openssl, "prisma generate" no detecta la versión real del sistema (OpenSSL 3.x en esta
# imagen) y genera por defecto el motor para 1.1.x, que no existe aquí y truena al correr.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm install --ignore-scripts
COPY prisma ./prisma
RUN npx prisma generate
COPY scripts ./scripts
CMD ["node", "scripts/audit-enrollments.js", "--apply"]
