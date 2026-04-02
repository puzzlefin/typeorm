"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeLevelColumn = TreeLevelColumn;
const __1 = require("../../");
/**
 * Creates a "level"/"length" column to the table that holds a closure table.
 */
function TreeLevelColumn() {
    return function (object, propertyName) {
        (0, __1.getMetadataArgsStorage)().columns.push({
            target: object.constructor,
            propertyName: propertyName,
            mode: "treeLevel",
            options: {}
        });
    };
}
//# sourceMappingURL=TreeLevelColumn.js.map