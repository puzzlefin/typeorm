"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Migration = void 0;
/**
 * Represents entity of the migration in the database.
 */
class Migration {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    // PUZZLE Use a big number for tie breaker to sort by tieBreaker, lowest goes first
    constructor(id, timestamp, name, instance, tieBreaker = 1000000) {
        this.id = id;
        this.timestamp = timestamp;
        this.name = name;
        this.instance = instance;
        this.tieBreaker = tieBreaker;
    }
}
exports.Migration = Migration;
//# sourceMappingURL=Migration.js.map