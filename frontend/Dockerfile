FROM node:22-alpine as build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# Production server using lightweight static server or preview
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
