# Proxy Checker

A robust and efficient proxy checking utility designed to validate and monitor HTTP/HTTPS proxies with detailed performance metrics and real-time status reporting.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

- ✅ Validate HTTP and HTTPS proxies
- ⚡ Concurrent proxy checking for improved performance
- 📊 Detailed performance metrics (response time, latency)
- 🔄 Real-time status monitoring and reporting
- 🎯 Configurable timeout and retry policies
- 📝 Comprehensive logging capabilities
- 🔐 Support for authenticated proxies
- 🌐 Supports multiple test endpoints
- 📦 RESTful API for easy integration

## Requirements

- Python 3.8 or higher
- pip (Python package manager)
- Virtual environment (recommended)
- For deployment: Docker or traditional server setup

## Installation

### Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/CWELOWNIA12344/proxy-checker.git
   cd proxy-checker
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Verify installation:**
   ```bash
   python -m proxy_checker --version
   ```

## Configuration

### Environment Variables

Create a `.env` file in the project root directory:

```env
# Proxy Checker Configuration
LOG_LEVEL=INFO
TIMEOUT=10
MAX_RETRIES=3
CONCURRENT_WORKERS=10
TEST_URL=https://httpbin.org/ip
BIND_ADDRESS=0.0.0.0
BIND_PORT=8000
```

### Configuration File

Alternatively, create `config.yaml` for advanced settings:

```yaml
checker:
  timeout: 10
  max_retries: 3
  concurrent_workers: 10
  test_url: https://httpbin.org/ip

logging:
  level: INFO
  format: "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
  file: logs/proxy_checker.log

api:
  bind_address: 0.0.0.0
  bind_port: 8000
  enable_cors: true
```

## Usage

### Command Line Interface

#### Check a single proxy:
```bash
python -m proxy_checker check --proxy http://proxy.example.com:8080
```

#### Check multiple proxies from file:
```bash
python -m proxy_checker check-file --input proxies.txt --output results.json
```

#### Continuous monitoring:
```bash
python -m proxy_checker monitor --input proxies.txt --interval 300
```

#### Start API server:
```bash
python -m proxy_checker api --host 0.0.0.0 --port 8000
```

### Python API

```python
from proxy_checker import ProxyChecker

checker = ProxyChecker(timeout=10, max_retries=3)

# Check single proxy
result = checker.check_proxy("http://proxy.example.com:8080")
print(result)

# Check multiple proxies
results = checker.check_proxies([
    "http://proxy1.example.com:8080",
    "http://proxy2.example.com:8080",
    "http://proxy3.example.com:8080"
])

for proxy, result in results.items():
    print(f"{proxy}: {result.status}")
```

## Deployment

### Docker Deployment

#### Build the Docker image:
```bash
docker build -t proxy-checker:latest .
```

#### Run the container:
```bash
docker run -d \
  --name proxy-checker \
  -p 8000:8000 \
  -e LOG_LEVEL=INFO \
  -e TIMEOUT=10 \
  -v $(pwd)/proxies.txt:/app/proxies.txt \
  -v $(pwd)/logs:/app/logs \
  proxy-checker:latest
```

#### Docker Compose:
```bash
docker-compose up -d
```

### Traditional Server Deployment

#### Using Systemd (Linux):

1. **Create service file** (`/etc/systemd/system/proxy-checker.service`):
   ```ini
   [Unit]
   Description=Proxy Checker Service
   After=network.target

   [Service]
   Type=simple
   User=proxy-checker
   WorkingDirectory=/opt/proxy-checker
   ExecStart=/opt/proxy-checker/venv/bin/python -m proxy_checker api
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```

2. **Enable and start service:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable proxy-checker
   sudo systemctl start proxy-checker
   ```

3. **Check service status:**
   ```bash
   sudo systemctl status proxy-checker
   ```

#### Using Gunicorn + Nginx:

1. **Install Gunicorn:**
   ```bash
   pip install gunicorn
   ```

2. **Start Gunicorn server:**
   ```bash
   gunicorn -w 4 -b 0.0.0.0:8000 proxy_checker.app:app
   ```

3. **Configure Nginx** (`/etc/nginx/sites-available/proxy-checker`):
   ```nginx
   server {
       listen 80;
       server_name proxy-checker.example.com;

       location / {
           proxy_pass http://127.0.0.1:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

4. **Enable Nginx site:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/proxy-checker /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### Cloud Deployment

#### AWS EC2:
1. Launch an EC2 instance (Ubuntu 20.04 LTS recommended)
2. Follow the Traditional Server Deployment steps
3. Use AWS Elastic IP for stable address
4. Configure Security Groups for ports 80/443

#### Heroku:
1. Create `Procfile`:
   ```
   web: gunicorn proxy_checker.app:app
   ```
2. Deploy:
   ```bash
   git push heroku main
   ```

#### DigitalOcean App Platform:
1. Connect repository to DigitalOcean
2. Configure in `app.yaml` for automatic deployment
3. Set environment variables through platform UI

## API Documentation

### Health Check
```
GET /health

Response (200):
{
    "status": "healthy",
    "timestamp": "2025-12-26T21:55:06Z"
}
```

### Check Single Proxy
```
POST /api/check

Request:
{
    "proxy": "http://proxy.example.com:8080"
}

Response (200):
{
    "proxy": "http://proxy.example.com:8080",
    "status": "active",
    "response_time": 245,
    "status_code": 200,
    "timestamp": "2025-12-26T21:55:06Z"
}
```

### Batch Check
```
POST /api/batch-check

Request:
{
    "proxies": [
        "http://proxy1.example.com:8080",
        "http://proxy2.example.com:8080"
    ]
}

Response (200):
{
    "results": [
        {
            "proxy": "http://proxy1.example.com:8080",
            "status": "active",
            "response_time": 245
        }
    ],
    "completed_at": "2025-12-26T21:55:06Z"
}
```

## Troubleshooting

### Common Issues

**Issue: Connection timeout errors**
- Solution: Increase `TIMEOUT` environment variable
- Check firewall rules and proxy accessibility

**Issue: High memory usage**
- Solution: Reduce `CONCURRENT_WORKERS` value
- Implement proxy rotation and cleanup

**Issue: API not responding**
- Solution: Check logs: `tail -f logs/proxy_checker.log`
- Verify port availability: `netstat -tulpn | grep 8000`

**Issue: Docker container exits immediately**
- Solution: Check logs: `docker logs proxy-checker`
- Verify mounted volumes and permissions

### Logging

Enable debug logging:
```bash
export LOG_LEVEL=DEBUG
python -m proxy_checker api
```

View logs:
```bash
tail -f logs/proxy_checker.log
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Install development dependencies
pip install -r requirements-dev.txt

# Run tests
pytest

# Run linting
flake8 proxy_checker/
black proxy_checker/

# Generate coverage report
pytest --cov=proxy_checker
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact: support@example.com
- Documentation: https://proxy-checker.readthedocs.io

---

**Last Updated:** December 26, 2025
**Version:** 1.0.0
