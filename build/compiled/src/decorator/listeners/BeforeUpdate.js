"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BeforeUpdate = BeforeUpdate;
const __1 = require("../../");
const EventListenerTypes_1 = require("../../metadata/types/EventListenerTypes");
/**
 * Calls a method on which this decorator is applied before this entity update.
 */
function BeforeUpdate() {
    return function (object, propertyName) {
        (0, __1.getMetadataArgsStorage)().entityListeners.push({
            target: object.constructor,
            propertyName: propertyName,
            type: EventListenerTypes_1.EventListenerTypes.BEFORE_UPDATE
        });
    };
}
//# sourceMappingURL=BeforeUpdate.js.map