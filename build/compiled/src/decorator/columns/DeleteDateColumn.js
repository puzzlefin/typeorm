"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteDateColumn = DeleteDateColumn;
const __1 = require("../../");
/**
 * This column will store a delete date of the soft-deleted object.
 * This date is being updated each time you soft-delete the object.
 */
function DeleteDateColumn(options) {
    return function (object, propertyName) {
        (0, __1.getMetadataArgsStorage)().columns.push({
            target: object.constructor,
            propertyName: propertyName,
            mode: "deleteDate",
            options: options || {}
        });
    };
}
//# sourceMappingURL=DeleteDateColumn.js.map