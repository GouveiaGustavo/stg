'use strict';

class FileDetailMessage {
  constructor(message, column = null, value = null, id = null) {
    this.message = message;
    this.column = column;
    this.value = value;
    this.id = id;
  }
}

module.exports = FileDetailMessage;
