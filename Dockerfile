FROM node:20

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN rm -rf node_modules package-lock.json && npm install

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code
COPY . .

# Make script executable
RUN chmod +x start-docker.sh

EXPOSE 3000

CMD ["./start-docker.sh"]
