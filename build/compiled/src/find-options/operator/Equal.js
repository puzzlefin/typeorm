"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Equal = Equal;
const FindOperator_1 = require("../FindOperator");
/**
 * Find Options Operator.
 * Example: { someField: Equal("value") }
 */
function Equal(value) {
    return new FindOperator_1.FindOperator("equal", value);
}
//# sourceMappingURL=Equal.js.map