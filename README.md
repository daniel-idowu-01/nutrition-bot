# Nutrition Bot

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://developers.facebook.com/docs/whatsapp/)

## Overview

Nutrition Bot is an AI-powered nutrition tracking application built with NestJS and TypeScript. It leverages advanced AI models (Claude and Gemini) to analyze meal images and provide personalized nutrition insights. Users interact with the bot via WhatsApp, allowing seamless meal logging and conversation-based nutrition coaching.

The application integrates with Cloudinary for image processing, MongoDB for data persistence, and the WhatsApp Business API for messaging. It's designed for scalability, maintainability, and ease of deployment using Docker.

## Features

- **AI-Powered Meal Analysis**: Upload meal photos via WhatsApp, and the bot analyzes them using Anthropic's Claude or Google's Gemini to extract nutritional information.
- **WhatsApp Integration**: Full conversational interface through WhatsApp, supporting text and image messages.
- **User Management**: Secure user profiles with authentication and data privacy.
- **Meal Logging**: Track daily meals with detailed nutritional breakdowns.
- **Conversational AI**: Engage in natural language conversations for nutrition advice and goal setting.
- **Image Processing**: Cloudinary integration for efficient image upload, storage, and processing.
- **Scalable Architecture**: Modular NestJS structure with dependency injection and microservices-ready design.
- **Comprehensive Testing**: Unit and end-to-end tests using Jest.
- **Docker Deployment**: Containerized application with Docker Compose for easy deployment.

## Tech Stack

### Backend Framework
- **NestJS**: Progressive Node.js framework for building efficient, reliable, and scalable server-side applications.
- **TypeScript**: Strongly typed programming language that builds on JavaScript.

### Database
- **MongoDB**: NoSQL database for flexible data storage.
- **Mongoose**: Elegant MongoDB object modeling for Node.js.

### AI & ML
- **Anthropic Claude**: Advanced language model for meal analysis and conversation.
- **Google Gemini**: Alternative AI model for nutritional insights.

### Integrations
- **WhatsApp Business API**: For messaging and user interaction.
- **Cloudinary**: Cloud-based image management and processing.

### Development Tools
- **ESLint**: Linting for code quality.
- **Prettier**: Code formatting.
- **Jest**: Testing framework for unit and e2e tests.
- **Docker**: Containerization for consistent deployment.

### Other Libraries
- **Axios**: HTTP client for API requests.
- **Class Validator/Transformer**: For request validation and transformation.
- **RxJS**: Reactive programming library.

## Architecture

The application follows a modular architecture using NestJS modules:

- **App Module**: Core application module with global configuration.
- **Users Module**: Handles user registration, authentication, and profile management.
- **Meals Module**: Manages meal logging, analysis, and nutritional data.
- **Conversations Module**: Processes and stores chat interactions.
- **WhatsApp Module**: Integrates with WhatsApp API for message handling.
- **Cloudinary Module**: Manages image uploads and processing.
- **AI Models Module**: Encapsulates AI integrations (Claude and Gemini) for meal analysis.

### Data Flow
1. User sends a message/image via WhatsApp.
2. WhatsApp webhook receives the message and routes it to the appropriate service.
3. For meal images: Uploaded to Cloudinary, then analyzed by AI models.
4. Nutritional data is extracted and stored in MongoDB.
5. Response is generated and sent back via WhatsApp.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Docker and Docker Compose
- MongoDB instance (local or cloud)
- WhatsApp Business API account
- Anthropic API key (for Claude)
- Google AI API key (for Gemini)
- Cloudinary account

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/nutrition-bot.git
   cd nutrition-bot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory with the following variables:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/nutrition-bot
   WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
   WHATSAPP_VERIFY_TOKEN=your_whatsapp_verify_token
   ANTHROPIC_API_KEY=your_anthropic_api_key
   GOOGLE_AI_API_KEY=your_google_ai_api_key
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

## Running the Application

### Development Mode
```bash
npm run start:dev
```

### Production Mode
```bash
npm run build
npm run start:prod
```

### Using Docker
```bash
docker-compose up --build
```

## Testing

### Unit Tests
```bash
npm run test
```

### End-to-End Tests
```bash
npm run test:e2e
```

### Test Coverage
```bash
npm run test:cov
```

## Deployment

The application is containerized using Docker for easy deployment:

1. **Build the Docker image:**
   ```bash
   docker build -t nutrition-bot .
   ```

2. **Run with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

For production deployment, ensure proper environment variables are set and consider using a reverse proxy like Nginx for SSL termination.

## API Documentation

The application exposes RESTful APIs for various functionalities. Key endpoints include:

- `POST /webhooks/whatsapp`: WhatsApp webhook for incoming messages
- `GET /users/:id`: Retrieve user profile
- `POST /meals`: Log a new meal
- `GET /meals/:userId`: Get user's meal history

For detailed API documentation, refer to the Swagger/OpenAPI specs or use tools like Postman to explore the endpoints.

## Usage

1. **User Registration**: Users start a conversation with the bot on WhatsApp.
2. **Meal Logging**: Send photos of meals for AI analysis.
3. **Nutrition Queries**: Ask questions about nutrition, calories, or dietary advice.
4. **Progress Tracking**: View meal history and nutritional summaries.

Example interaction:
- User: [sends photo of a salad]
- Bot: "Analyzing your meal... This appears to be a mixed green salad with tomatoes and cucumbers. Estimated calories: 150. Macronutrients: Protein 5g, Carbs 20g, Fat 8g."

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request.

### Code Style
- Follow the existing ESLint and Prettier configurations.
- Write tests for new features.
- Ensure all tests pass before submitting a PR.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For questions or support, please open an issue on GitHub or contact the development team.

---

Built with ❤️ using NestJS and cutting-edge AI technologies.
