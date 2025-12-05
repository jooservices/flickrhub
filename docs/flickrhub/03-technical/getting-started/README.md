# Getting Started with FlickrHub

Welcome to FlickrHub! This guide will help you get up and running quickly.

---

## 🚀 Quick Start (5 minutes)

1. **Clone and setup**:

   ```bash
   git clone <repo-url>
   cd flickrhub
   npm install
   ```

2. **Configure environment**:

   ```bash
   cp .env.example .env
   # Edit .env with your Flickr API credentials
   ```

3. **Start services**:

   ```bash
   docker compose up -d --build
   ```

4. **Generate OAuth token**:

   ```bash
   MONGO_URL=mongodb://localhost:27019/flickrhub npm run cli:auth
   ```

5. **Test API**:
   ```bash
   curl -X POST http://localhost:3000/api/v1/flickr/rest \
     -H "Content-Type: application/json" \
     -d '{"method":"flickr.test.echo","params":{"name":"test"},"user_id":"<user_id>","target":"rest"}'
   ```

That's it! You're ready to use FlickrHub.

---

## 📚 Documentation

- **[Installation Guide](installation.md)** - Detailed installation instructions
- **[Quick Start](quick-start.md)** - Extended quick start guide
- **[Development Setup](development-setup.md)** - Local development environment

---

## 🎯 Next Steps

- Read the [API Documentation](../03-technical/api/README.md)
- Check the [Operations Guide](../07-guides/operations.md)
- Review the [Architecture](../02-architecture/README.md)

---

## ❓ Need Help?

- Check [Troubleshooting](../07-guides/troubleshooting.md)
- Review [FAQ](../04-data/glossary.md#faq)
- Open an issue on GitHub

---

**Ready to dive deeper?** → [Installation Guide](installation.md)
