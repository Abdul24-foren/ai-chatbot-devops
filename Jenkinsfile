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
          bat 'npm ci'
          bat 'npm test -- --passWithNoTests'
          bat 'npx prisma generate'
        }
      }
    }

    stage('Frontend checks') {
      steps {
        dir('frontend') {
          bat 'npm ci'
          bat 'npm run build'
        }
      }
    }

    stage('Build images') {
      steps {
        bat 'docker-compose build backend frontend'
      }
    }

    stage('Push images') {
      steps {
        withCredentials([
          usernamePassword(
            credentialsId: 'dockerhub-credentials',
            usernameVariable: 'DOCKER_USERNAME',
            passwordVariable: 'DOCKER_PASSWORD'
          )
        ]) {

          bat '''
          powershell -NoProfile -Command "$env:DOCKER_PASSWORD | docker login --username $env:DOCKER_USERNAME --password-stdin"
          '''

          bat 'docker push "%BACKEND_IMAGE%:%IMAGE_TAG%"'

          bat 'docker tag "%BACKEND_IMAGE%:%IMAGE_TAG%" "%BACKEND_IMAGE%:latest"'

          bat 'docker push "%BACKEND_IMAGE%:latest"'

          bat 'docker push "%FRONTEND_IMAGE%:%IMAGE_TAG%"'

          bat 'docker tag "%FRONTEND_IMAGE%:%IMAGE_TAG%" "%FRONTEND_IMAGE%:latest"'

          bat 'docker push "%FRONTEND_IMAGE%:latest"'

          bat 'docker logout'
        }
      }
    }

    stage('Deploy Compose') {
      steps {
        withCredentials([
          string(
            credentialsId: 'gemini-api-key',
            variable: 'GEMINI_API_KEY'
          ),
          string(
            credentialsId: 'jwt-secret',
            variable: 'JWT_SECRET'
          ),
          string(
            credentialsId: 'postgres-password',
            variable: 'POSTGRES_PASSWORD'
          )
        ]) {

          bat '''
          (
            echo POSTGRES_PASSWORD=%POSTGRES_PASSWORD%
            echo JWT_SECRET=%JWT_SECRET%
            echo GEMINI_API_KEY=%GEMINI_API_KEY%
            echo GEMINI_MODEL=gemini-3.5-flash
          ) > .env.ci

          docker-compose --env-file .env.ci up -d --remove-orphans
          set "COMPOSE_EXIT=%ERRORLEVEL%"
          del /Q .env.ci
          exit /b %COMPOSE_EXIT%
          '''
        }
      }
    }
  }

  post {
  always {
    bat 'if exist .env.ci del /Q .env.ci'
  }
}
}