import {ValueTransformer} from "./ValueTransformer";

/**
 * Column options specific to embedded column.
 */
export interface ColumnEmbeddedOptions {

    /**
     * Embedded column prefix.
     * If set to empty string or false, then prefix is not set at all.
     */
    prefix?: string | boolean;

    /**
     * Specifies a value transformer that is to be used to (un)marshal
     * the entire embedded object when reading or writing to the database.
     */
    transformer?: ValueTransformer|ValueTransformer[];

}
