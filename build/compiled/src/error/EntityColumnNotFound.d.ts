/**
 *
 */
export declare class EntityColumnNotFound extends Error {
    propertyPath: string;
    extra?: any;
    name: string;
    constructor(propertyPath: string, extra?: any);
}
