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

# Create dummy certificate for nginx to start
echo "### Creating dummy certificate for $domains..."
path="/etc/letsencrypt/live/$domains"
mkdir -p "$data_path/conf/live/$domains"
docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:$rsa_key_size -days 1\
    -keyout '$path/privkey.pem' \
    -out '$path/fullchain.pem' \
    -subj '/CN=localhost'" certbot
echo

# Start nginx with dummy certificate
echo "### Starting nginx..."
docker compose -f docker-compose.prod.yml up --force-recreate -d nginx
echo

# Delete dummy certificate
echo "### Deleting dummy certificate..."
docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  rm -rf /etc/letsencrypt/live/$domains && \
  rm -rf /etc/letsencrypt/archive/$domains && \
  rm -rf /etc/letsencrypt/renewal/$domains.conf" certbot
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
echo "### Reloading nginx..."
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo "### Certificate installation complete!"
