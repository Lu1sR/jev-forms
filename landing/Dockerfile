# Landing docutecec.com (Next.js standalone build). Public service on Railway.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* values are baked into the page at build time.
ARG NEXT_PUBLIC_WHATSAPP_NUMBER
ARG NEXT_PUBLIC_SALES_EMAIL
ARG NEXT_PUBLIC_FORMULARIOS_URL
ARG NEXT_PUBLIC_GESTOR_URL
ENV NEXT_PUBLIC_WHATSAPP_NUMBER=$NEXT_PUBLIC_WHATSAPP_NUMBER \
    NEXT_PUBLIC_SALES_EMAIL=$NEXT_PUBLIC_SALES_EMAIL \
    NEXT_PUBLIC_FORMULARIOS_URL=$NEXT_PUBLIC_FORMULARIOS_URL \
    NEXT_PUBLIC_GESTOR_URL=$NEXT_PUBLIC_GESTOR_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
