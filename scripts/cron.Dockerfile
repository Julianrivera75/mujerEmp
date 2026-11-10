# Imagen mínima para el servicio de cron "enrollment-sync": solo necesita Prisma Client y los
# scripts, no la app de Next.js completa (evita el build de next build, que no hace falta aquí).
FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --ignore-scripts
COPY prisma ./prisma
RUN npx prisma generate
COPY scripts ./scripts
CMD ["node", "scripts/audit-enrollments.js", "--apply"]
