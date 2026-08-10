#!/bin/bash

# Init Let's Encrypt for Gymholic
# This script obtains SSL certificates for gymholic.ae

set -e

domains=(gymholic.ae www.gymholic.ae)
rsa_key_size=4096
data_path="./certbot"
email="admin@gymholic.ae" # Replace with your email
staging=0 # Set to 1 for testing

echo "### Preparing directories..."
mkdir -p "$data_path/conf/live/$domains"
mkdir -p "$data_path/www"

# Download recommended TLS parameters if not exists
if [ ! -e "$data_path/conf/options-ssl-nginx.conf" ] || [ ! -e "$data_path/conf/ssl-dhparams.pem" ]; then
  echo "### Downloading recommended TLS parameters..."
  mkdir -p "$data_path/conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$data_path/conf/options-ssl-nginx.conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$data_path/conf/ssl-dhparams.pem"
fi

# Temporarily use HTTP-only nginx config
echo "### Switching to HTTP-only nginx config temporarily..."
if [ -f "nginx/default.conf.backup" ]; then
  echo "Backup already exists"
else
  cp nginx/default.conf nginx/default.conf.backup
  cp nginx/default-http-only.conf nginx/default.conf
  echo "Switched to HTTP-only config"
fi

# Rebuild nginx image with HTTP-only config
echo "### Building HTTP-only nginx image..."
docker build -t gymholic-nginx-temp:latest nginx/

# Start nginx with HTTP-only config
echo "### Starting nginx with HTTP-only config..."
docker compose -f docker-compose.prod.yml stop nginx 2>/dev/null || true
docker rm gymholic-nginx 2>/dev/null || true
docker run -d \
  --name gymholic-nginx \
  --network gymholic_gymholic-net \
  -p 80:80 \
  -p 443:443 \
  -v "$(pwd)/certbot/www:/var/www/certbot:ro" \
  gymholic-nginx-temp:latest

echo "### Waiting for nginx to start..."
sleep 5
echo

# Request real certificate
echo "### Requesting Let's Encrypt certificate for $domains..."
domain_args=""
for domain in "${domains[@]}"; do
  domain_args="$domain_args -d $domain"
done

# Select appropriate email arg
case "$email" in
  "") email_arg="--register-unsafely-without-email" ;;
  *) email_arg="--email $email" ;;
esac

# Enable staging mode if needed
if [ $staging != "0" ]; then staging_arg="--staging"; fi

docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $email_arg \
    $domain_args \
    --rsa-key-size $rsa_key_size \
    --agree-tos \
    --force-renewal" certbot
echo

# Reload nginx
echo "### Stopping temporary nginx and starting full stack with HTTPS..."
docker stop gymholic-nginx
docker rm gymholic-nginx

# Restore full nginx config with HTTPS
if [ -f "nginx/default.conf.backup" ]; then
  mv nginx/default.conf.backup nginx/default.conf
  echo "Restored HTTPS nginx config"
fi

# Rebuild nginx with HTTPS config
docker build -t ghcr.io/yassincodes404/gymholic-nginx:latest nginx/

# Start full stack with HTTPS
docker compose -f docker-compose.prod.yml up -d --force-recreate nginx

echo "### Certificate installation complete!"
echo "### Testing HTTPS..."
sleep 5
curl -skI https://localhost/ | head -5 || echo "HTTPS test failed - check nginx logs"
