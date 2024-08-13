/**
 *
 */
export declare class EntityColumnNotFound extends Error {
    name: string;
    extra?: any;
    constructor(propertyPath: string);
}
