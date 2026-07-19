import morgan from "morgan";

const isProduction = process.env["NODE_ENV"] === "production";

const morganFormat = isProduction
  ? ":method :url :status :res[content-length] - :response-time ms"
  : ":method :url :status :res[content-length] - :response-time ms";

export const logger = morgan(morganFormat, {
  skip: (_req, res) => {
    if (isProduction) {
      return res.statusCode < 400;
    }
    return false;
  },
});

export default logger;
