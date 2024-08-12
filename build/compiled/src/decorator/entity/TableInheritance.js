"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableInheritance = TableInheritance;
const __1 = require("../../");
/**
 * Sets for entity to use table inheritance pattern.
 */
function TableInheritance(options) {
    return function (target) {
        (0, __1.getMetadataArgsStorage)().inheritances.push({
            target: target,
            pattern: options && options.pattern ? options.pattern : "STI",
            column: options && options.column ? typeof options.column === "string" ? { name: options.column } : options.column : undefined
        });
    };
}
//# sourceMappingURL=TableInheritance.js.map