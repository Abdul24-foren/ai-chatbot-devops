pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  environment {
    BACKEND_IMAGE = "${DOCKERHUB_USERNAME}/ai-chatbot-backend"
    FRONTEND_IMAGE = "${DOCKERHUB_USERNAME}/ai-chatbot-frontend"
    IMAGE_TAG = "${BUILD_NUMBER}"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Backend checks') {
      steps {
        dir('backend') {
          sh 'npm ci'
          sh 'npm test -- --passWithNoTests'
          sh 'npx prisma generate'
        }
      }
    }

    stage('Frontend checks') {
      steps {
        dir('frontend') {
          sh 'npm ci'
          sh 'npm run build'
        }
      }
    }

    stage('Build images') {
      steps {
        sh 'docker compose build backend frontend'
      }
    }

    stage('Push images') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
          sh 'printf "%s" "$DOCKER_PASSWORD" | docker login --username "$DOCKER_USERNAME" --password-stdin'
          sh 'docker push "$BACKEND_IMAGE:$IMAGE_TAG"'
          sh 'docker tag "$BACKEND_IMAGE:$IMAGE_TAG" "$BACKEND_IMAGE:latest"'
          sh 'docker push "$BACKEND_IMAGE:latest"'
          sh 'docker push "$FRONTEND_IMAGE:$IMAGE_TAG"'
          sh 'docker tag "$FRONTEND_IMAGE:$IMAGE_TAG" "$FRONTEND_IMAGE:latest"'
          sh 'docker push "$FRONTEND_IMAGE:latest"'
          sh 'docker logout'
        }
      }
    }

    stage('Deploy Compose') {
      when {
        branch 'main'
      }
      steps {
        withCredentials([
          string(credentialsId: 'gemini-api-key', variable: 'GEMINI_API_KEY'),
          string(credentialsId: 'jwt-secret', variable: 'JWT_SECRET'),
          string(credentialsId: 'postgres-password', variable: 'POSTGRES_PASSWORD')
        ]) {
          sh '''
            umask 077
            cat > .env.ci <<EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_SECRET=$JWT_SECRET
GEMINI_API_KEY=$GEMINI_API_KEY
GEMINI_MODEL=gemini-3.6-flash
EOF
            docker compose --env-file .env.ci up -d --remove-orphans
            rm -f .env.ci
          '''
        }
      }
    }
  }

  post {
    always {
      sh 'rm -f .env.ci || true'
      junit testResults: 'backend/coverage/**/*.xml', allowEmptyResults: true
    }
  }
}
