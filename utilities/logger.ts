import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({
      filename: "service-error.log",
      level: "error",
    }),
    new winston.transports.File({ filename: "service-combined.log" }),
  ],
});

if (process.env.APP_ENV === "local") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

export default logger;
