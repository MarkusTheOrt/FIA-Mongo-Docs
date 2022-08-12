export default class DateFormatter {
  /**
   * Formats a date into a YYYY-MM-DD string.
   * @param {Date} date date to format.
   * @returns {String} formatted String.
   */
  static isoDate(date = new Date()) {
    const year = date.getUTCFullYear();
    // month starts at 0
    const month = this.#pad(date.getUTCMonth() + 1);
    const day = this.#pad(date.getUTCDate());
    return "" + year + "-" + month + "-" + day;
  }

  /**
   * Formats a date into a YYYY-MM-DDThh:mm:ssZ String.
   * @param {Date} date date to format.
   * @returns {String} formatted String.
   */
  static isoTime(date = new Date()) {
    const s = this.isoDate(date);
    const hours = this.#pad(date.getUTCHours());
    const minutes = this.#pad(date.getUTCMinutes());
    const seconds = this.#pad(date.getUTCSeconds());
    return s + "T" + hours + ":" + minutes + ":" + seconds + "Z";
  }

  /**
   * Adds Left Zero-Padding to a number
   * @param {Number} number base Number.
   * @param {Number} size String length.
   * @returns {String} String containing the Padded number.
   */
  static #pad(number: number, size = 2) {
    let s = number.toString();
    while (s.length < size) {
      s = "0" + s;
    }
    return s;
  }
}
