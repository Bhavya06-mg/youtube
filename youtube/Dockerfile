# ---- Stage 1: build the React app ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Backend URL baked in at build time (works for Vite and Create React App)
ARG VITE_API_URL
ARG REACT_APP_API_URL
ENV VITE_API_URL=$VITE_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build
# Vite outputs to dist/, Create React App outputs to build/
RUN mkdir -p /out && (cp -r dist/. /out/ 2>/dev/null || cp -r build/. /out/)

# ---- Stage 2: serve static files with nginx ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /out /usr/share/nginx/html
EXPOSE 80
