# yz-access-code-api

Cloud API for qualification-code control.

This service does only two things:

1. Bind one code to one device.
2. Unbind a code (only by the same bound device).

Bind policy:

- Default codes: max 1 unique-device bind slot.
- Legacy leaked 10 codes: max 30 unique-device bind slots.

The frontend in `index.html` has been updated to call this API on:

- bind code
- unbind code

## Quick start

```bash
cd cloud-api
npm install
cp .env.example .env
npm run seed -- --count=1000 --force
npm run start
```

Health check:

```bash
curl http://127.0.0.1:8787/api/v1/health
```

## Environment

`.env.example`:

```env
PORT=8787
CODE_DB_FILE=./data/codes.json
CORS_ORIGINS=*
```

Notes:

- `CODE_DB_FILE` stores all generated/bound codes.
- `CORS_ORIGINS` accepts `*` or comma-separated origins.

## Generate 1000 codes

```bash
npm run seed -- --count=1000 --force
```

Generated files:

- `data/codes.json`
- `data/codes-list.txt`

## API

### POST `/api/v1/codes/bind`

Request:

```json
{
  "code": "YZ-ABCD-EFGH-JKLM",
  "deviceId": "dev-xxxx"
}
```

Success:

```json
{
  "ok": true,
  "status": "bound",
  "code": "YZ-ABCD-EFGH-JKLM"
}
```

Possible errors:

- `404` code not found
- `409` code already bound to another device

### POST `/api/v1/codes/unbind`

Request:

```json
{
  "code": "YZ-ABCD-EFGH-JKLM",
  "deviceId": "dev-xxxx"
}
```

Possible error:

- `403` only bound device can unbind

### GET `/api/v1/health`

Returns service status and code stats.

## Aliyun ECS deploy tutorial (Ubuntu 22.04)

### 1) Security group

Open:

- `22` for SSH
- `80/443` for Nginx
- `8787` only for temporary direct testing (recommended: close in production)

### 2) Install runtime

```bash
sudo apt update
sudo apt install -y curl git
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
node -v
npm -v
```

### 3) Deploy API

```bash
cd /opt
sudo git clone <YOUR_REPO_URL> yz.cjcx
cd yz.cjcx/cloud-api
npm install
cp .env.example .env
npm run seed -- --count=1000 --force
pm2 start src/server.js --name yz-code-api
pm2 save
pm2 startup
```

### 4) Nginx reverse proxy

Install:

```bash
sudo apt install -y nginx
```

Create `/etc/nginx/sites-available/yz-code-api`:

```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/yz-code-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5) HTTPS (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.your-domain.com
```

## Frontend API base URL

Frontend uses:

```js
window.YZ_ADMIN_API_BASE_URL
```

Set it before page scripts:

```html
<script>
  window.YZ_ADMIN_API_BASE_URL = "https://api.your-domain.com";
</script>
```

If not set, frontend default is:

```txt
http://127.0.0.1:8787
```
