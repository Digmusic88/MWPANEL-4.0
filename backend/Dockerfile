FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install && npm install -g @nestjs/cli
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev
EXPOSE 3010
CMD ["node", "dist/main.js"]
