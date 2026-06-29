import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
// Side-effect import: sets DB_PATH/UPLOAD_DIR/LOG_DIR before the engine loads.
// Must come before the engine router import below.
import "../engine/bootstrap.js";
// @ts-expect-error - ported CommonJS engine, no type declarations
import engineRouter from "../engine/routes/index.js";
// @ts-expect-error - ported CommonJS engine, no type declarations
import { errorHandler } from "../engine/middleware/errorHandler.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api", router);
app.use("/api", engineRouter);

// JSON error handler from the ported engine so failures return { error } as JSON.
app.use(errorHandler);

export default app;
