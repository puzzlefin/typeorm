"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Check = Check;
const __1 = require("../");
/**
 * Creates a database check.
 * Can be used on entity property or on entity.
 * Can create checks with composite columns when used on entity.
 */
function Check(nameOrExpression, maybeExpression) {
    const name = maybeExpression ? nameOrExpression : undefined;
    const expression = maybeExpression ? maybeExpression : nameOrExpression;
    if (!expression)
        throw new Error(`Check expression is required`);
    return function (clsOrObject, propertyName) {
        (0, __1.getMetadataArgsStorage)().checks.push({
            target: propertyName ? clsOrObject.constructor : clsOrObject,
            name: name,
            expression: expression
        });
    };
}
//# sourceMappingURL=Check.js.map