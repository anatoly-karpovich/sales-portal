import * as dotenv from "dotenv";
import express from "express";
import http from "http";
import initSocketIO from "./ws/socket";
import mongoose from "mongoose";
import fileUpload from "express-fileupload";
import swaggerDocs from "./utils/swagger.js";
import { errorHandleMiddleware } from "./middleware/errorHandleMiddleware";
import cors from "cors";
import { startNotificationCleanup } from "./utils/cron";
import {
  authRouter,
  customerOrdersRouter,
  customerRouter,
  notificationRouter,
  orderCommentsRouter,
  orderDeliveryRouter,
  orderReceiveRouter,
  orderRouter,
  orderStatusRouter,
  productsRouter,
  rebatesRouter,
  usersRouter,
  metricsRouter,
} from "./routers/index.js";
import { seed } from "./mongo/init";
import { getDbUrl } from "./mongo/url";

dotenv.config();

const app = express();

const cors_options: cors.CorsOptions = {
  // origin: ["http://127.0.0.1:5502", "https://anatoly-karpovich.github.io"],
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  preflightContinue: false,
  optionsSuccessStatus: 200,
  exposedHeaders: ["Authorization", "X-User-Name", "Content-Disposition", "Content-Type"],
};

app.use(cors(cors_options));
app.options("*", cors());
app.use(express.json());
app.use(express.static("static"));
app.use(fileUpload({}));
app.use("/api", rebatesRouter);
app.use("/api", authRouter);
app.use("/api", productsRouter);
app.use("/api", customerRouter);
app.use("/api", orderRouter);
app.use("/api", orderStatusRouter);
app.use("/api", orderReceiveRouter);
app.use("/api", orderDeliveryRouter);
app.use("/api", orderCommentsRouter);
app.use("/api", customerOrdersRouter);
app.use("/api", metricsRouter);
app.use("/api", usersRouter);
app.use("/api", notificationRouter);
app.use(errorHandleMiddleware);

async function startApp() {
  const DB_URL = getDbUrl();
  const PORT = +process.env.PORT || 5000;
  try {
    mongoose.connect(DB_URL, {});
    await seed();
    const server = http.createServer(app);
    initSocketIO(server);
    server.listen(PORT, () => {
      console.log("Server started on port " + PORT);
    });
    swaggerDocs(app);
  } catch (e) {
    console.log(e);
  }
}

startNotificationCleanup();

startApp();
