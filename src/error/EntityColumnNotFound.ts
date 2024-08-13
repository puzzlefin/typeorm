/**
 *
 */
export class EntityColumnNotFound extends Error {
    name = "EntityColumnNotFound";
    public extra?: any;

    constructor(public propertyPath: string) {
        super();
        Object.setPrototypeOf(this, EntityColumnNotFound.prototype);
        this.message = `No entity column "${propertyPath}" was found.`;
    }

}
