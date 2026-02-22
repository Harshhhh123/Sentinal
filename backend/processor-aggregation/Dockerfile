FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY processor.js .

CMD ["node", "processor.js"]