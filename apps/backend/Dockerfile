FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/backend/package.json ./apps/backend/package.json

RUN npm install

COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend

EXPOSE 5000

CMD ["npm", "run", "dev"]
