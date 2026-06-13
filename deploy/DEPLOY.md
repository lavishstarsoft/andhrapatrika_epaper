# Andhra Patrika Epaper — Hetzner Deployment Guide

Yellowsingam laage **Docker + Hetzner VPS** lo deploy cheyadaniki step-by-step guide.

---

## Architecture

```
User → Cloudflare DNS → Hetzner VPS (Nginx :443)
                              ↓
                    Docker container (:3001 → :3000)
                              ↓
              MongoDB Atlas + Cloudflare R2
```

**Ports (same server lo Yellowsingam unte):**

| App            | Docker port | Nginx proxy |
|----------------|-------------|-------------|
| Yellowsingam   | 3000        | yellowsingam domain |
| Andhra Patrika | 3001        | andhrapatrikaa.com  |

---

## Part 1 — Hetzner VPS setup (first time only)

Yellowsingam already Hetzner lo unte **Part 1 skip** cheyachu — Docker & Nginx already untayi.

### 1.1 Create / use a Hetzner Cloud server

- **OS:** Ubuntu 22.04 or 24.04
- **Type:** CX22 or higher (2 vCPU, 4 GB RAM — PDF conversion ki recommended)
- Same server lo rendu apps run cheyachu

### 1.2 SSH into server

```bash
ssh root@YOUR_SERVER_IP
```

### 1.3 Install Docker

```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
```

### 1.4 Install Nginx + Certbot (SSL)

```bash
apt install -y nginx certbot python3-certbot-nginx git
systemctl enable nginx
```

---

## Part 2 — Push code to GitHub

Local machine lo:

```bash
cd "andhra patrika Epaper"
git add Dockerfile docker-compose.yml deploy/ .env.example .dockerignore
git commit -m "Add Docker and Hetzner deployment config"
git push origin main
```

---

## Part 3 — Deploy on Hetzner server

### 3.1 Clone repo

```bash
mkdir -p /opt/andhrapatrika-epaper
cd /opt/andhrapatrika-epaper
git clone YOUR_GITHUB_REPO_URL .
```

### 3.2 Create production env file

```bash
cp .env.example .env.production
nano .env.production
```

Fill these values (local `.env.local` nundi copy cheyachu):

```env
NEXTAUTH_URL=https://www.andhrapatrikaa.com
NEXTAUTH_SECRET=your-secret-here
MONGODB_URI=mongodb+srv://...
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_ACCESS_KEY_ID=...
CLOUDFLARE_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET_NAME=...
CLOUDFLARE_R2_PUBLIC_URL=https://...
```

Generate new secret (optional):

```bash
openssl rand -base64 32
```

### 3.3 Build and start Docker

```bash
cd /opt/andhrapatrika-epaper
docker compose build
docker compose up -d
docker compose ps
docker compose logs -f andhrapatrika
```

Test locally on server:

```bash
curl -I http://127.0.0.1:3001
```

---

## Part 4 — Nginx reverse proxy

### 4.1 Copy nginx config

```bash
cp /opt/andhrapatrika-epaper/deploy/nginx/andhrapatrika.conf \
   /etc/nginx/sites-available/andhrapatrika

ln -sf /etc/nginx/sites-available/andhrapatrika /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 4.2 SSL certificate

```bash
certbot --nginx -d www.andhrapatrikaa.com -d andhrapatrikaa.com
```

Certbot automatically HTTPS redirect add chestundi.

---

## Part 5 — DNS (Cloudflare)

Cloudflare dashboard lo:

| Type | Name | Content        | Proxy |
|------|------|----------------|-------|
| A    | @    | HETZNER_IP     | Proxied (orange cloud) |
| A    | www  | HETZNER_IP     | Proxied |

**Important:** PDF upload ki Cloudflare proxy timeout issue unte, admin upload time ki DNS only (grey cloud) try cheyandi, or Cloudflare rule lo `/api/*` bypass cheyandi.

Cloudflare **Upload limit:** Free plan lo max 100MB. Larger PDFs ki direct DNS (grey cloud) or bypass rule use cheyandi.

---

## Part 6 — Update / redeploy

Server lo:

```bash
cd /opt/andhrapatrika-epaper
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

Or manually:

```bash
git pull origin main
docker compose build
docker compose up -d
```

---

## Part 7 — Useful commands

```bash
# Logs
docker compose logs -f andhrapatrika

# Restart
docker compose restart

# Stop
docker compose down

# Rebuild after code change
docker compose build --no-cache && docker compose up -d

# Check container health
docker compose ps
curl http://127.0.0.1:3001
```

---

## Troubleshooting

### PDF upload fails / timeout

1. Nginx `client_max_body_size 100m` unda check cheyandi (`deploy/nginx/andhrapatrika.conf`)
2. Cloudflare proxy timeout — `/api/editions` ki bypass rule add cheyandi
3. Docker logs: `docker compose logs -f`

### 502 Bad Gateway

```bash
docker compose ps          # container running?
curl http://127.0.0.1:3001 # app responding?
nginx -t                   # nginx config ok?
```

### MongoDB connection error

- MongoDB Atlas lo Hetzner server IP whitelist cheyandi (Network Access → Add IP)
- Or `0.0.0.0/0` (less secure, testing ki matrame)

### NextAuth login fails

- `NEXTAUTH_URL` exact domain match avvali: `https://www.andhrapatrikaa.com`
- `NEXTAUTH_SECRET` set chesara check cheyandi

---

## Same server — Yellowsingam + Andhra Patrika

```
/opt/yellowsingam-epaper     → port 3000
/opt/andhrapatrika-epaper    → port 3001
```

Rendu separate nginx config files, rendu separate domains. MongoDB & R2 same or different — `.env.production` lo configure cheyandi.
