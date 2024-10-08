"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OneToOne = OneToOne;
const __1 = require("../../");
/**
 * One-to-one relation allows to create direct relation between two entities. Entity1 have only one Entity2.
 * Entity1 is an owner of the relationship, and storages Entity1 id on its own side.
 */
function OneToOne(typeFunctionOrTarget, inverseSideOrOptions, options) {
    // normalize parameters
    let inverseSideProperty;
    if (typeof inverseSideOrOptions === "object") {
        options = inverseSideOrOptions;
    }
    else {
        inverseSideProperty = inverseSideOrOptions;
    }
    return function (object, propertyName) {
        if (!options)
            options = {};
        // now try to determine it its lazy relation
        let isLazy = options && options.lazy === true ? true : false;
        if (!isLazy && Reflect && Reflect.getMetadata) { // automatic determination
            const reflectedType = Reflect.getMetadata("design:type", object, propertyName);
            if (reflectedType && typeof reflectedType.name === "string" && reflectedType.name.toLowerCase() === "promise")
                isLazy = true;
        }
        (0, __1.getMetadataArgsStorage)().relations.push({
            target: object.constructor,
            propertyName: propertyName,
            // propertyType: reflectedType,
            isLazy: isLazy,
            relationType: "one-to-one",
            type: typeFunctionOrTarget,
            inverseSideProperty: inverseSideProperty,
            options: options
        });
    };
}
//# sourceMappingURL=OneToOne.js.map