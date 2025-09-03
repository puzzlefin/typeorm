import {MigrationInterface} from "./MigrationInterface";

/**
 * Represents entity of the migration in the database.
 */
export class Migration {

    // -------------------------------------------------------------------------
    // Public Properties
    // -------------------------------------------------------------------------

    /**
     * Migration id.
     * Indicates order of the executed migrations.
     */
    id: number|undefined;

    /**
     * Timestamp of the migration.
     */
    timestamp: number;

    /**
     * Tie breaker of the migration when there are duplicate timestamps. Lowest goes first.
     */
    tieBreaker: number;

    /**
     * Name of the migration (class name).
     */
    name: string;

    /**
     * Migration instance that needs to be run.
     */
    instance?: MigrationInterface;

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    // PUZZLE Use a big number for tie breaker to sort by tieBreaker, lowest goes first
    constructor(id: number|undefined, timestamp: number, name: string, instance?: MigrationInterface, tieBreaker: number = 1000000) {
        this.id = id;
        this.timestamp = timestamp;
        this.name = name;
        this.instance = instance;
        this.tieBreaker = tieBreaker;
    }

}