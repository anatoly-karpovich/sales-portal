FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=http://localhost:8686/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8585

CMD ["nginx", "-g", "daemon off;"]
