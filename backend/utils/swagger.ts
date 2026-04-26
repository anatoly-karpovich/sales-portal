import { Express } from "express";
import swaggerjJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import pkg from "../package.json";

const { version } = pkg;

function getSwaggerServerUrl() {
  const envUrl = process.env.SWAGGER_SERVER_URL?.trim();
  if (envUrl) {
    return envUrl;
  }

  const environment = process.env.ENVIRONMENT;
  if (environment === "local") {
    const port = process.env.PORT || "5000";
    return `http://localhost:${port}`;
  }

  return "https://aqa-course-project.app";
}

function swaggerDocs(app: Express) {
  const options = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Sales Portal API",
        version: version,
        description: "AQA course project API",
      },
      servers: [
        {
          url: getSwaggerServerUrl(),
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT", // Modify this based on your token format
          },
        },
      },
    },
    apis: ["./dist/routers/*.router.js"],
  };

  const swaggerSpec = swaggerjJsdoc(options);
  //Swagger Page
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  //Docs in JSON format
  app.get("doc.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
}

export default swaggerDocs;
