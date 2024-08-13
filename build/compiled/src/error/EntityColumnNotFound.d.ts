/**
 *
 */
export declare class EntityColumnNotFound extends Error {
    propertyPath: string;
    name: string;
    extra?: any;
    constructor(propertyPath: string);
}
