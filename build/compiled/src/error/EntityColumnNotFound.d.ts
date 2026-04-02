/**
 *
 */
export declare class EntityColumnNotFound extends Error {
    propertyPath: string;
    extra?: any | undefined;
    name: string;
    constructor(propertyPath: string, extra?: any | undefined);
}
