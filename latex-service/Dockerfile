FROM debian:bookworm-slim

# Install Node.js and curl
RUN apt-get update && apt-get install -y \
    curl \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install Tectonic
RUN curl -L \
    https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.15.0/tectonic-0.15.0-x86_64-unknown-linux-musl.tar.gz \
    | tar xz -C /usr/local/bin

# Set working directory
WORKDIR /app

# Install dependencies first (better Docker layer caching)
COPY package.json .
RUN npm install

# Copy server file
COPY server.js .

EXPOSE 3001
CMD ["node", "server.js"]