# Use official node image
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json yarn.lock ./
# if using npm: copy package-lock.json
RUN yarn install --production

# Bundle app source
COPY . .

# Expose port
ENV PORT=4000
EXPOSE 4000

# Health check (optional)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "server.js"]