import {QueryRunner} from "../query-runner/QueryRunner";

/**
 * Migrations should implement this interface and all its methods.
 */
export interface MigrationInterface {
    /**
     * Optional migration name, defaults to class name.
     */
    name?: string;

    /**
     * Run the migrations.
     */
    up(queryRunner: QueryRunner): Promise<any>;

    /**
     * Reverse the migrations.
     */
    down(queryRunner: QueryRunner): Promise<any>;

    /**
     * Run the migrations pre/post hooks.
     */
    upPreTransaction?(queryRunner: QueryRunner): Promise<any>;
    upPostTransaction?(queryRunner: QueryRunner): Promise<any>;

    /**
     * Reverse the migrations pre/post hooks.
     */
    downPreTransaction?(queryRunner: QueryRunner): Promise<any>;
    downPostTransaction?(queryRunner: QueryRunner): Promise<any>;

}
