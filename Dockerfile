# Dockerfile example
# Use an official Node.js runtime as a base image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install application dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Expose the port the application listens on (check server.js for the correct port)
EXPOSE 3000

# Define the command to run the application
CMD [ "npm", "start" ]

