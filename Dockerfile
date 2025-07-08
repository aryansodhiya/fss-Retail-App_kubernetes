# Dockerfile example
FROM node:18

WORKDIR /Capsule

COPY package*.json ./
RUN npm install

COPY ../server.js .

EXPOSE 3130  
CMD ["npm", "start"]
