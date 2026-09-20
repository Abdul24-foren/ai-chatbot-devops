# AI-Driven Chatbot Platform

A production-style chatbot platform with React, Express, PostgreSQL, Prisma, JWT authentication, Google Gemini streaming, Docker Compose, Jenkins, Terraform, Kubernetes, Prometheus, and Grafana.

## 1. Project Overview

The application provides authenticated conversations backed by PostgreSQL. User messages are sent to Google Gemini through the backend, streamed to the browser with Server-Sent Events, and persisted with Prisma.

## 2. Architecture

```text
Browser -> Nginx/React frontend -> Express API -> Prisma -> PostgreSQL
                                      |
                                      -> Google Gemini API

Docker Compose: frontend, backend, PostgreSQL
Operations: Jenkins -> Docker Hub -> Compose or Kubernetes
Monitoring: Prometheus -> cAdvisor; Grafana dashboards
```

## 3. Tech Stack

- Frontend: React, Vite, Tailwind CSS, React Router, Axios, Markdown rendering
- Backend: Node.js 24, Express, ES Modules, JWT, bcryptjs, SSE
- Database: PostgreSQL 18 and Prisma 5.22.0
- AI: Google Gemini through `@google/genai`
- Delivery: Docker, Docker Compose, Jenkins, Docker Hub
- Infrastructure: AWS EC2, Terraform, Kubernetes
- Monitoring: Prometheus, Grafana, cAdvisor

## 4. Local Development

Copy `.env.example` to `.env` and set the values locally. Never commit `.env`.

```powershell
Copy-Item .env.example .env
cd backend
npm ci
npx prisma generate
npx prisma migrate dev
npm run dev
```

In another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

The local frontend is available at `http://localhost:5173` and the API at `http://localhost:5000`.

## 5. Environment Variables

Root `.env` values used by Compose:

| Variable | Purpose |
| --- | --- |
| `POSTGRES_PASSWORD` | PostgreSQL container password |
| `JWT_SECRET` | JWT signing secret |
| `GEMINI_API_KEY` | Google AI Studio key |
| `GEMINI_MODEL` | Gemini model, normally gemini-3.5-flash |

Backend local development additionally uses `DATABASE_URL`, `PORT`, `CLIENT_URL`, and `SYSTEM_PROMPT`. See `backend/.env.example` for the complete list.

## 6. Docker Setup

The backend uses Debian Bookworm and installs OpenSSL before Prisma Client generation. This is required by Prisma 5.22.0 on the container image.

```powershell
docker compose build backend frontend
docker compose up -d
docker compose ps
docker compose logs -f backend
```

The frontend is served by Nginx on port 5173, the API is on port 5000, and PostgreSQL is on port 5432. PostgreSQL data is stored in the named `postgres_data` volume.

The backend runs `prisma migrate deploy` before starting the API. Do not put API keys or passwords in either Dockerfile.

## 7. Docker Compose Setup

Compose waits for PostgreSQL and the backend health checks before starting dependent services. Useful checks:

```powershell
curl.exe http://localhost:5000/api/health
docker compose exec postgres pg_isready -U postgres -d ai_chatbot
docker volume ls
```

If Docker Desktop reports a read-only containerd or metadata filesystem, restart Docker Desktop and rerun the build. The source build itself should show Prisma generation without the OpenSSL warning.

## 8. Jenkins CI/CD

`Jenkinsfile` performs checkout, backend tests and Prisma generation, frontend build, Docker image builds, Docker Hub pushes, and Compose deployment on the `main` branch.

Create Jenkins credentials with these IDs:

- `dockerhub-credentials`: username/password or access token
- `gemini-api-key`: secret text
- `jwt-secret`: secret text
- `postgres-password`: secret text

Set the Jenkins global `DOCKERHUB_USERNAME` value. The Jenkins agent needs Node.js, Docker, Docker Compose, and Git. Configure the job as a Pipeline from SCM and keep deployment credentials in Jenkins, not in the repository.

## 9. Docker Hub

The pipeline publishes:

```text
<dockerhub-username>/ai-chatbot-backend:<build-number>
<dockerhub-username>/ai-chatbot-backend:latest
<dockerhub-username>/ai-chatbot-frontend:<build-number>
<dockerhub-username>/ai-chatbot-frontend:latest
```

Use a Docker Hub access token rather than a personal password.

## 10. AWS Deployment

The initial deployment target is one EC2 instance running Docker Compose and PostgreSQL. This is suitable for a student portfolio or low-traffic demonstration; use managed database and load-balancing services for production scale.

On the instance:

```bash
sudo apt-get update
curl -fsSL https://get.docker.com | sh
git clone <repository-url> /opt/ai-chatbot
cd /opt/ai-chatbot
cp .env.example .env
nano .env
docker compose up -d
```

Open only the required security-group ports. Prefer restricting SSH to your own IP and place the frontend behind HTTPS before public use.

## 11. Terraform

Terraform provisions an Ubuntu EC2 host, VPC, public subnet, internet gateway, route table, encrypted EBS root volume, and security group.

```powershell
cd terraform
Copy-Item terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with an existing EC2 key pair and repository URL
terraform init
terraform fmt -check
terraform validate
terraform plan
terraform apply
```

AWS credentials must come from the AWS CLI profile, environment, or an approved CI credential provider. They are not stored in Terraform files.

## 12. Kubernetes

The `k8s` directory contains namespace, ConfigMap, Secret example, backend/frontend deployments and services, PostgreSQL deployment/service, and a PVC.

Create the real secret outside Git, then deploy:

```powershell
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl create secret generic ai-chatbot-secrets -n ai-chatbot --from-env-file=.env.k8s
kubectl apply -f k8s/postgres-pvc.yaml
kubectl apply -f k8s/postgres-deployment.yaml -f k8s/postgres-service.yaml
kubectl apply -f k8s/backend-deployment.yaml -f k8s/backend-service.yaml
kubectl apply -f k8s/frontend-deployment.yaml -f k8s/frontend-service.yaml
kubectl get pods -n ai-chatbot
```

Update the placeholder Docker Hub username and build the frontend with a browser-reachable `VITE_API_URL` for the target cluster.

## 13. Prometheus and Grafana

The monitoring bundle uses Prometheus, Grafana, and cAdvisor for container metrics:

```powershell
cd monitoring
docker compose up -d
```

Prometheus is available at `http://localhost:9090` and Grafana at `http://localhost:3000`. Configure dashboards and the Prometheus data source in Grafana. Monitoring is intentionally separate from the application Compose file.

## 14. Troubleshooting

- Backend restarts with `libssl.so.1.1`: rebuild the Debian Bookworm image after the Dockerfile OpenSSL installation.
- Backend cannot connect to PostgreSQL: check `docker compose ps`, the PostgreSQL health check, and `DATABASE_URL` host `postgres` inside Compose.
- Gemini returns 404 for `gemini-2.5-flash`: use a model available to the project, currently `gemini-3.5-flash`.
- Frontend cannot call the API: verify the Vite build argument and `VITE_API_URL`; browser clients cannot resolve an internal Kubernetes service name.
- Docker reports a read-only containerd filesystem: restart Docker Desktop, then rebuild.
- Never print or commit `GEMINI_API_KEY`, `JWT_SECRET`, database passwords, or generated Kubernetes secrets.

## 15. Project Folder Structure

```text
backend/                 Express API, Prisma schema, migrations, tests
frontend/                React/Vite application and Nginx image
k8s/                     Kubernetes manifests
monitoring/              Prometheus and Grafana Compose bundle
terraform/               AWS infrastructure configuration
docker-compose.yml       Local application stack
Jenkinsfile              CI/CD pipeline
.env.example             Non-secret configuration template
```

## Validation

```powershell
cd backend; npm test
cd ..\frontend; npm run build
cd ..; docker compose config --quiet
```
