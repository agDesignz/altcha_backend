# altcha_backend

A self-hosted, privacy-respecting CAPTCHA backend service built with Node.js and Express. Implements the [ALTCHA](https://altcha.org) proof-of-work protocol to protect web forms from spam and bot submissions — without cookies, fingerprinting, or third-party tracking.

**Live integration:** Currently serving the contact form at [alexgeer.dev](https://alexgeer.dev)

---

## What it does

When a visitor interacts with a contact form on a connected site, the browser requests a cryptographic challenge from this API. The visitor's browser solves the challenge (a lightweight proof-of-work computation that happens invisibly in the background), and the resulting solution token is submitted with the form. The backend verifies the token before the form is processed — blocking bots without asking humans to identify traffic lights.

This service was built to solve a real problem: adding spam protection to a portfolio contact form without depending on Google reCAPTCHA or any third-party service that tracks users.

---

## Tech stack

- **Runtime:** Node.js
- **Framework:** Express
- **Caching / rate limiting:** Redis
- **Protocol:** [ALTCHA](https://altcha.org) (proof-of-work challenge/verify)
- **Containerization:** Docker (multi-container setup)
- **Hosting:** Hostinger VPS, managed via Coolify
- **Logging:** Morgan (HTTP) + custom security event logger

---

## Architecture

The application follows a layered service architecture, keeping concerns clearly separated:

```
server.js           → boots the HTTP server
app.js              → wires together middleware, services, and routes
├── middleware/
│   ├── corsConfig.js        → CORS origin whitelist (env-configured)
│   └── securityHeaders.js   → HTTP security headers
├── services/
│   ├── altchaService.js     → challenge creation and solution verification
│   └── rateLimitService.js  → Redis-backed rate limiting
├── controllers/
│   └── altchaController.js  → request handling and response formatting
└── routes/
    └── altchaRoutes.js      → API route definitions
```

### API endpoints

| Method | Endpoint                   | Description                             |
| ------ | -------------------------- | --------------------------------------- |
| `GET`  | `/api/v1/altcha/challenge` | Issues a new ALTCHA challenge           |
| `POST` | `/api/v1/altcha/verify`    | Verifies a submitted challenge solution |
| `GET`  | `/health`                  | Health check                            |

---

## Security features

- **CORS origin whitelist** — only requests from explicitly allowed domains are accepted; configured via environment variables, making it straightforward to add new sites
- **Redis-backed rate limiting** — prevents challenge endpoint abuse
- **Security headers** — applied globally via middleware
- **No cookies, no fingerprinting** — the ALTCHA protocol is fully privacy-compliant

---

## Docker setup

The service runs in a Docker container alongside a Redis container, connected on a shared Docker network. Environment configuration (Redis URL, HMAC key, allowed origins) is managed through a `.env` file.

```bash
docker compose up -d
```

---

## Environment variables

| Variable                | Description                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| `PORT`                  | Server port (default: `4000`)                                                                 |
| `ALLOWED_ORIGINS`       | Comma-separated list of allowed CORS origins                                                  |
| `ALTCHA_KEY_[sitename]` | Specific key for each site. [sitename] is called from the frontend when making fetch requests |

---

## Extending to new sites

To add a new site to the allowed origins:

1. add its URL to the `ALLOWED_ORIGINS` environment variable. Be sure to separate URLs with commas.
2. Create a secret key for your site, and add it to the `ALTCHA_KEY_[sitename]` environment variable. Replace `[sitename]` with a name, or unique identifier.
   Example: `ALTCHA_KEY_mysitename=somebigsecret`

#### On the frontend:

1. Your frontend must call the correct endpoints to get the challenge and verify the solution.
   2.Your site must also provide the `[sitename]` you set up in the backend environment variables above.

Example of possible frontend environment variables:

```
ALTCHA_API_CHALLENGE=<your-backend-url>/api/v1/altcha/challenge
ALTCHA_API_VERIFY=<your-backend-url>/api/v1/altcha/verify
ALTCHA_KEY_ID=[sitename]
```

---

## Why ALTCHA?

[ALTCHA](https://altcha.org) is a free, open-source, self-hostable alternative to reCAPTCHA and hCaptcha. It uses a proof-of-work mechanism rather than behavioral tracking or image puzzles. For a developer portfolio — where the point is partly to demonstrate thoughtful technical choices — using a privacy-respecting, self-hosted CAPTCHA felt like the right call.

---

## Related

- **[alexgeer.dev](https://alexgeer.dev)** — the portfolio site using this backend
- **[portfolio_2](https://github.com/agDesignz/portfolio_2)** — frontend source for the portfolio

---

## License

[Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/)

You are free to share and adapt this project for non-commercial purposes with attribution. Commercial use is not permitted.

---

_Built by [Alex Geer](https://alexgeer.dev)_
