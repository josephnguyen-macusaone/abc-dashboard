# ABC Dashboard

A full-stack dashboard application with modern frontend and enterprise-grade backend API.

## 📁 Project Structure

```
abc-dashboard/
├── backend/              # Node.js/Express API with Clean Architecture
├── frontend/             # Next.js React app with TypeScript
├── deployment/           # Production deployment configurations
│   ├── docker/          # Docker container deployment
│   ├── openlitespeed/   # Traditional OpenLiteSpeed deployment
│   └── shared/          # Shared configuration files
└── README.md            # This file
```

## 🚀 Quick Start

### Development Setup
**Prerequisites:** Node.js 18+, MongoDB, Redis (optional)

```bash
# Clone repository
git clone <repository-url>
cd abc-dashboard

# Start backend (detailed setup in backend/README.md)
cd backend
npm install
npm run dev

# Start frontend (detailed setup in frontend/README.md)
cd frontend
npm install
npm run dev
```

### Production Deployment

Choose your preferred deployment method:

#### 🐳 Docker Deployment (Recommended)
**Best for:** Production, scaling, modern DevOps
```bash
cd deployment/docker
chmod +x docker-deploy.sh
./docker-deploy.sh
```

#### 🏗️ OpenLiteSpeed Deployment
**Best for:** Existing OpenLiteSpeed servers, manual control
```bash
cd deployment/openlitespeed
chmod +x deploy.sh
./deploy.sh
```

## 🌐 Production URLs

After deployment, your application will be available at:
- **Frontend:** https://portal.abcsalon.us
- **API:** https://portal.abcsalon.us/api/v1
- **API Docs:** https://portal.abcsalon.us/api-docs
- **Health Check:** https://portal.abcsalon.us/api/v1/health

## 📚 Documentation Links

- **[📚 Backend API](./backend/README.md)** - Complete API documentation and architecture
- **[🎨 Frontend App](./frontend/README.md)** - React application guide and development
- **[🚀 Deployment Guide](./deployment/README.md)** - Production deployment options
- **[🐳 Docker Deployment](./deployment/docker/README.md)** - Container-based deployment
- **[🏗️ OpenLiteSpeed Deployment](./deployment/openlitespeed/README.md)** - Traditional server deployment

## 🏗️ Architecture Overview

### Backend (Node.js/Express)
- **Clean Architecture** with dependency injection
- **MongoDB** with Mongoose ODM
- **Redis** caching (optional)
- **JWT** authentication
- **Role-based** access control
- **Swagger** API documentation

### Frontend (Next.js/React)
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Zustand** for state management
- **React Hook Form** with validation
- **Axios** for API calls

### Deployment Options
- **Docker:** Containerized deployment with Docker Compose
- **OpenLiteSpeed:** Traditional server deployment with PM2
- **SSL/TLS:** Automatic HTTPS with Let's Encrypt
- **Load Balancing:** Nginx reverse proxy
- **Monitoring:** Health checks and logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

---

**🎯 Ready to get started? Check out the deployment guides for production setup!**