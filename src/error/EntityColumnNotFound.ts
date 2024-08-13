/**
 *
 */
export class EntityColumnNotFound extends Error {
    name = "EntityColumnNotFound";

    constructor(public propertyPath: string, public extra?: any) {
        super();
        Object.setPrototypeOf(this, EntityColumnNotFound.prototype);
        this.message = `No entity column "${propertyPath}" was found.`;
    }

}
