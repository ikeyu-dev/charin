FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

RUN npm install --no-save \
    lightningcss-linux-arm64-gnu \
    @tailwindcss/oxide-linux-arm64-gnu \
    @unrs/resolver-binding-linux-arm64-gnu

COPY prisma ./prisma
COPY prisma.config.ts ./
COPY .env ./
RUN npx prisma generate

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && npm run dev"]
