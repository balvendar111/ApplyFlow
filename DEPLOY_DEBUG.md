# Deploy Debug - Render Logs Kaise Dekhein

## Step 1: Deploy Logs

1. Render Dashboard → **applyflow** (web service) par click karo
2. **Logs** tab kholo
3. **Build logs** aur **Deploy logs** dono check karo

---

## Common Errors & Fixes

### Build Failed
- **pymupdf / fitz error** → Dockerfile mein system deps add karni padegi
- **npm run build failed** → frontend build issue
- **pip install failed** → requirements conflict

### Deploy Failed (container start)
- **Port binding** → Render `PORT` env use karta hai, hum 8000 hardcode karte hain
- **Database connection** → DATABASE_URL sahi hai?
- **Import error** → koi Python package missing

### Health Check Failed
- `/health` endpoint 200 return nahi kar raha
- Startup mein crash ho raha hai

---

## Logs Copy karke bhejo

**Build logs** (Docker build ke dauran) aur **Deploy logs** (container start ke dauran) copy karo — exact error dikhega.
