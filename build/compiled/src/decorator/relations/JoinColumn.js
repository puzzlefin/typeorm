"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JoinColumn = JoinColumn;
const __1 = require("../../");
/**
 * JoinColumn decorator used on one-to-one relations to specify owner side of relationship.
 * It also can be used on both one-to-one and many-to-one relations to specify custom column name
 * or custom referenced column.
 */
function JoinColumn(optionsOrOptionsArray) {
    return function (object, propertyName) {
        const options = Array.isArray(optionsOrOptionsArray) ? optionsOrOptionsArray : [optionsOrOptionsArray || {}];
        options.forEach(options => {
            (0, __1.getMetadataArgsStorage)().joinColumns.push({
                target: object.constructor,
                propertyName: propertyName,
                name: options.name,
                referencedColumnName: options.referencedColumnName
            });
        });
    };
}
//# sourceMappingURL=JoinColumn.js.map