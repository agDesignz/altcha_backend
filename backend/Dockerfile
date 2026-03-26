# Use official node image
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY ./package.json ./
COPY ./yarn.lock ./
# if using npm: copy package-lock.json
RUN yarn install

# Bundle app source
COPY . .

# Expose port
EXPOSE 4000

CMD ["node", "src/server.js"]