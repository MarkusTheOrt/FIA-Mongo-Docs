import * as fs from "fs";
import * as Path from "path";
import DateFormatter from "./DateFormatter.js";

const logsPath = Path.join(process.cwd(), "../../Logs");

export type logLevel = " WARN" | "ERROR" | " INFO" | "FATAL";

export class Log {
  private date: Date;
  private writeStream;

  constructor() {
    if (fs.existsSync(logsPath) === false) {
      fs.mkdirSync(logsPath);
    }

    this.date = new Date();
    this.writeStream = fs.createWriteStream(
      logsPath + "/" + DateFormatter.isoDate(this.date) + ".log",
      { flags: "a" }
    );
  }

  /**
   * Logs a message to the log file and console.
   * @param {String} level Log Level specified.
   * @param {String} message Message to log.
   * @returns {Promise} Promise that returns once log has written.
   */
  async #log(level: logLevel, message: string) {
    if (this.date.getUTCDate() !== new Date().getUTCDate()) {
      this.date = new Date();
      this.writeStream = fs.createWriteStream(
        logsPath + "/" + DateFormatter.isoDate(this.date) + ".log"
      );
    }

    // If stream is not writable (new file etc...) wait until it is.
    if (this.writeStream.writable === false) {
      await new Promise<void>((resolve) => {
        this.writeStream.on("open", () => {
          resolve();
        });
      });
    }

    const logMessage = `[${DateFormatter.isoTime()}] ${level}: ${message}`;

    console.log(logMessage);

    return new Promise<void>((resolve) => {
      this.writeStream.write(logMessage + "\n", () => {
        resolve();
      });
    });
  }

  /**
   * Logs a Warning.
   * @param {String} message Message to log.
   */
  Warn(message: string) {
    return this.#log(" WARN", message);
  }

  /**
   * Logs a Message.
   * @param {String} message Message to log.
   */
  Info(message: string) {
    return this.#log(" INFO", message);
  }

  /**
   * Logs an Error.
   * @param {String} message Message to log.
   */
  Error(message: string) {
    return this.#log("ERROR", message);
  }

  /**
   * Logs a Stack Trace.
   * @param {String} stack Stacktrace to log.
   */
  Stack(stack: string) {
    return this.#log("FATAL", stack);
  }
}

export default new Log();
