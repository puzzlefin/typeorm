"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityColumnNotFound = void 0;
/**
 *
 */
class EntityColumnNotFound extends Error {
    constructor(propertyPath, extra) {
        super();
        this.propertyPath = propertyPath;
        this.extra = extra;
        this.name = "EntityColumnNotFound";
        Object.setPrototypeOf(this, EntityColumnNotFound.prototype);
        this.message = `No entity column "${propertyPath}" was found.`;
    }
}
exports.EntityColumnNotFound = EntityColumnNotFound;
//# sourceMappingURL=EntityColumnNotFound.js.map