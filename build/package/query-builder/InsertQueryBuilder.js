"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsertQueryBuilder = void 0;
const tslib_1 = require("tslib");
const CockroachDriver_1 = require("../driver/cockroachdb/CockroachDriver");
const SapDriver_1 = require("../driver/sap/SapDriver");
const QueryBuilder_1 = require("./QueryBuilder");
const SqlServerDriver_1 = require("../driver/sqlserver/SqlServerDriver");
const PostgresDriver_1 = require("../driver/postgres/PostgresDriver");
const MysqlDriver_1 = require("../driver/mysql/MysqlDriver");
const RandomGenerator_1 = require("../util/RandomGenerator");
const InsertResult_1 = require("./result/InsertResult");
const ReturningStatementNotSupportedError_1 = require("../error/ReturningStatementNotSupportedError");
const InsertValuesMissingError_1 = require("../error/InsertValuesMissingError");
const ReturningResultsEntityUpdator_1 = require("./ReturningResultsEntityUpdator");
const AbstractSqliteDriver_1 = require("../driver/sqlite-abstract/AbstractSqliteDriver");
const SqljsDriver_1 = require("../driver/sqljs/SqljsDriver");
const BroadcasterResult_1 = require("../subscriber/BroadcasterResult");
const EntitySchema_1 = require("../entity-schema/EntitySchema");
const OracleDriver_1 = require("../driver/oracle/OracleDriver");
const AuroraDataApiDriver_1 = require("../driver/aurora-data-api/AuroraDataApiDriver");
/**
 * Allows to build complex sql queries in a fashion way and execute those queries.
 */
class InsertQueryBuilder extends QueryBuilder_1.QueryBuilder {
    // -------------------------------------------------------------------------
    // Public Implemented Methods
    // -------------------------------------------------------------------------
    /**
     * Gets generated sql query without parameters being replaced.
     */
    getQuery() {
        let sql = this.createComment();
        sql += this.createInsertExpression();
        return sql.trim();
    }
    /**
     * Executes sql generated by query builder and returns raw database results.
     */
    execute() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            // console.time(".value sets");
            const valueSets = this.getValueSets();
            // console.timeEnd(".value sets");
            // If user passed empty array of entities then we don't need to do
            // anything.
            //
            // Fixes GitHub issues #3111 and #5734. If we were to let this through
            // we would run into problems downstream, like subscribers getting
            // invoked with the empty array where they expect an entity, and SQL
            // queries with an empty VALUES clause.
            if (valueSets.length === 0)
                return new InsertResult_1.InsertResult();
            // console.time("QueryBuilder.execute");
            // console.time(".database stuff");
            const queryRunner = this.obtainQueryRunner();
            let transactionStartedByUs = false;
            try {
                // start transaction if it was enabled
                if (this.expressionMap.useTransaction === true && queryRunner.isTransactionActive === false) {
                    yield queryRunner.startTransaction();
                    transactionStartedByUs = true;
                }
                // console.timeEnd(".database stuff");
                // call before insertion methods in listeners and subscribers
                if (this.expressionMap.callListeners === true && this.expressionMap.mainAlias.hasMetadata) {
                    const broadcastResult = new BroadcasterResult_1.BroadcasterResult();
                    valueSets.forEach(valueSet => {
                        queryRunner.broadcaster.broadcastBeforeInsertEvent(broadcastResult, this.expressionMap.mainAlias.metadata, valueSet);
                    });
                    if (broadcastResult.promises.length > 0)
                        yield Promise.all(broadcastResult.promises);
                }
                let declareSql = null;
                let selectOutputSql = null;
                // if update entity mode is enabled we may need extra columns for the returning statement
                // console.time(".prepare returning statement");
                const returningResultsEntityUpdator = new ReturningResultsEntityUpdator_1.ReturningResultsEntityUpdator(queryRunner, this.expressionMap);
                if (this.expressionMap.updateEntity === true && this.expressionMap.mainAlias.hasMetadata) {
                    if (!(valueSets.length > 1 && this.connection.driver instanceof OracleDriver_1.OracleDriver)) {
                        this.expressionMap.extraReturningColumns = returningResultsEntityUpdator.getInsertionReturningColumns();
                    }
                    if (this.expressionMap.extraReturningColumns.length > 0 && this.connection.driver instanceof SqlServerDriver_1.SqlServerDriver) {
                        declareSql = this.connection.driver.buildTableVariableDeclaration("@OutputTable", this.expressionMap.extraReturningColumns);
                        selectOutputSql = `SELECT * FROM @OutputTable`;
                    }
                }
                // console.timeEnd(".prepare returning statement");
                // execute query
                // console.time(".getting query and parameters");
                const [insertSql, parameters] = this.getQueryAndParameters();
                // console.timeEnd(".getting query and parameters");
                const insertResult = new InsertResult_1.InsertResult();
                // console.time(".query execution by database");
                const statements = [declareSql, insertSql, selectOutputSql];
                insertResult.raw = yield queryRunner.query(statements.filter(sql => sql != null).join(";\n\n"), parameters);
                // console.timeEnd(".query execution by database");
                // load returning results and set them to the entity if entity updation is enabled
                if (this.expressionMap.updateEntity === true && this.expressionMap.mainAlias.hasMetadata) {
                    // console.time(".updating entity");
                    yield returningResultsEntityUpdator.insert(insertResult, valueSets);
                    // console.timeEnd(".updating entity");
                }
                // call after insertion methods in listeners and subscribers
                if (this.expressionMap.callListeners === true && this.expressionMap.mainAlias.hasMetadata) {
                    const broadcastResult = new BroadcasterResult_1.BroadcasterResult();
                    valueSets.forEach(valueSet => {
                        queryRunner.broadcaster.broadcastAfterInsertEvent(broadcastResult, this.expressionMap.mainAlias.metadata, valueSet);
                    });
                    if (broadcastResult.promises.length > 0)
                        yield Promise.all(broadcastResult.promises);
                }
                // close transaction if we started it
                // console.time(".commit");
                if (transactionStartedByUs) {
                    yield queryRunner.commitTransaction();
                }
                // console.timeEnd(".commit");
                return insertResult;
            }
            catch (error) {
                // rollback transaction if we started it
                if (transactionStartedByUs) {
                    try {
                        yield queryRunner.rollbackTransaction();
                    }
                    catch (rollbackError) { }
                }
                throw error;
            }
            finally {
                // console.time(".releasing connection");
                if (queryRunner !== this.queryRunner) { // means we created our own query runner
                    yield queryRunner.release();
                }
                if (this.connection.driver instanceof SqljsDriver_1.SqljsDriver && !queryRunner.isTransactionActive) {
                    yield this.connection.driver.autoSave();
                }
                // console.timeEnd(".releasing connection");
                // console.timeEnd("QueryBuilder.execute");
            }
        });
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Specifies INTO which entity's table insertion will be executed.
     */
    into(entityTarget, columns) {
        entityTarget = entityTarget instanceof EntitySchema_1.EntitySchema ? entityTarget.options.name : entityTarget;
        const mainAlias = this.createFromAlias(entityTarget);
        this.expressionMap.setMainAlias(mainAlias);
        this.expressionMap.insertColumns = columns || [];
        return this;
    }
    /**
     * Values needs to be inserted into table.
     */
    values(values) {
        this.expressionMap.valuesSet = values;
        return this;
    }
    /**
     * Optional returning/output clause.
     */
    output(output) {
        return this.returning(output);
    }
    /**
     * Optional returning/output clause.
     */
    returning(returning) {
        // not all databases support returning/output cause
        if (!this.connection.driver.isReturningSqlSupported())
            throw new ReturningStatementNotSupportedError_1.ReturningStatementNotSupportedError();
        this.expressionMap.returning = returning;
        return this;
    }
    /**
     * Indicates if entity must be updated after insertion operations.
     * This may produce extra query or use RETURNING / OUTPUT statement (depend on database).
     * Enabled by default.
     */
    updateEntity(enabled) {
        this.expressionMap.updateEntity = enabled;
        return this;
    }
    /**
     * Adds additional ON CONFLICT statement supported in postgres and cockroach.
     */
    onConflict(statement) {
        this.expressionMap.onConflict = statement;
        return this;
    }
    /**
     * Adds additional ignore statement supported in databases.
     */
    orIgnore(statement = true) {
        this.expressionMap.onIgnore = statement;
        return this;
    }
    /**
     * Adds additional update statement supported in databases.
     */
    orUpdate(statement) {
        this.expressionMap.onUpdate = {};
        if (statement && Array.isArray(statement.conflict_target))
            this.expressionMap.onUpdate.conflict = ` ( ${statement.conflict_target.map((columnName) => this.escape(columnName)).join(", ")} ) `;
        if (statement && typeof statement.conflict_target === "string")
            this.expressionMap.onUpdate.conflict = ` ON CONSTRAINT ${this.escape(statement.conflict_target)} `;
        if (statement && Array.isArray(statement.columns))
            this.expressionMap.onUpdate.columns = statement.columns.map(column => `${this.escape(column)} = :${column}`).join(", ");
        if (statement && Array.isArray(statement.overwrite)) {
            if (this.connection.driver instanceof MysqlDriver_1.MysqlDriver || this.connection.driver instanceof AuroraDataApiDriver_1.AuroraDataApiDriver) {
                this.expressionMap.onUpdate.overwrite = statement.overwrite.map(column => `${column} = VALUES(${column})`).join(", ");
            }
            else if (this.connection.driver instanceof PostgresDriver_1.PostgresDriver || this.connection.driver instanceof AbstractSqliteDriver_1.AbstractSqliteDriver || this.connection.driver instanceof CockroachDriver_1.CockroachDriver) {
                this.expressionMap.onUpdate.overwrite = statement.overwrite.map(column => `${this.escape(column)} = EXCLUDED.${this.escape(column)}`).join(", ");
            }
        }
        return this;
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Creates INSERT express used to perform insert query.
     */
    createInsertExpression() {
        const tableName = this.getTableName(this.getMainTableName());
        const valuesExpression = this.createValuesExpression(); // its important to get values before returning expression because oracle rely on native parameters and ordering of them is important
        const returningExpression = (this.connection.driver instanceof OracleDriver_1.OracleDriver && this.getValueSets().length > 1) ? null : this.createReturningExpression(); // oracle doesnt support returning with multi-row insert
        const columnsExpression = this.createColumnNamesExpression();
        let query = "INSERT ";
        if (this.connection.driver instanceof MysqlDriver_1.MysqlDriver || this.connection.driver instanceof AuroraDataApiDriver_1.AuroraDataApiDriver) {
            query += `${this.expressionMap.onIgnore ? " IGNORE " : ""}`;
        }
        query += `INTO ${tableName}`;
        // add columns expression
        if (columnsExpression) {
            query += `(${columnsExpression})`;
        }
        else {
            if (!valuesExpression && (this.connection.driver instanceof MysqlDriver_1.MysqlDriver || this.connection.driver instanceof AuroraDataApiDriver_1.AuroraDataApiDriver)) // special syntax for mysql DEFAULT VALUES insertion
                query += "()";
        }
        // add OUTPUT expression
        if (returningExpression && this.connection.driver instanceof SqlServerDriver_1.SqlServerDriver) {
            query += ` OUTPUT ${returningExpression}`;
        }
        // add VALUES expression
        if (valuesExpression) {
            if (this.connection.driver instanceof OracleDriver_1.OracleDriver && this.getValueSets().length > 1) {
                query += ` ${valuesExpression}`;
            }
            else {
                query += ` VALUES ${valuesExpression}`;
            }
        }
        else {
            if (this.connection.driver instanceof MysqlDriver_1.MysqlDriver || this.connection.driver instanceof AuroraDataApiDriver_1.AuroraDataApiDriver) { // special syntax for mysql DEFAULT VALUES insertion
                query += " VALUES ()";
            }
            else {
                query += ` DEFAULT VALUES`;
            }
        }
        if (this.connection.driver instanceof PostgresDriver_1.PostgresDriver || this.connection.driver instanceof AbstractSqliteDriver_1.AbstractSqliteDriver || this.connection.driver instanceof CockroachDriver_1.CockroachDriver) {
            query += `${this.expressionMap.onIgnore ? " ON CONFLICT DO NOTHING " : ""}`;
            query += `${this.expressionMap.onConflict ? " ON CONFLICT " + this.expressionMap.onConflict : ""}`;
            if (this.expressionMap.onUpdate) {
                const { overwrite, columns, conflict } = this.expressionMap.onUpdate;
                query += `${columns ? " ON CONFLICT " + conflict + " DO UPDATE SET " + columns : ""}`;
                query += `${overwrite ? " ON CONFLICT " + conflict + " DO UPDATE SET " + overwrite : ""}`;
            }
        }
        else if (this.connection.driver instanceof MysqlDriver_1.MysqlDriver || this.connection.driver instanceof AuroraDataApiDriver_1.AuroraDataApiDriver) {
            if (this.expressionMap.onUpdate) {
                const { overwrite, columns } = this.expressionMap.onUpdate;
                query += `${columns ? " ON DUPLICATE KEY UPDATE " + columns : ""}`;
                query += `${overwrite ? " ON DUPLICATE KEY UPDATE " + overwrite : ""}`;
            }
        }
        // add RETURNING expression
        if (returningExpression && (this.connection.driver instanceof PostgresDriver_1.PostgresDriver || this.connection.driver instanceof OracleDriver_1.OracleDriver || this.connection.driver instanceof CockroachDriver_1.CockroachDriver)) {
            query += ` RETURNING ${returningExpression}`;
        }
        // Inserting a specific value for an auto-increment primary key in mssql requires enabling IDENTITY_INSERT
        // IDENTITY_INSERT can only be enabled for tables where there is an IDENTITY column and only if there is a value to be inserted (i.e. supplying DEFAULT is prohibited if IDENTITY_INSERT is enabled)
        if (this.connection.driver instanceof SqlServerDriver_1.SqlServerDriver
            && this.expressionMap.mainAlias.hasMetadata
            && this.expressionMap.mainAlias.metadata.columns
                .filter((column) => this.expressionMap.insertColumns.length > 0 ? this.expressionMap.insertColumns.indexOf(column.propertyPath) !== -1 : column.isInsert)
                .some((column) => this.isOverridingAutoIncrementBehavior(column))) {
            query = `SET IDENTITY_INSERT ${tableName} ON; ${query}; SET IDENTITY_INSERT ${tableName} OFF`;
        }
        return query;
    }
    /**
     * Gets list of columns where values must be inserted to.
     */
    getInsertedColumns() {
        if (!this.expressionMap.mainAlias.hasMetadata)
            return [];
        return this.expressionMap.mainAlias.metadata.columns.filter(column => {
            // if user specified list of columns he wants to insert to, then we filter only them
            if (this.expressionMap.insertColumns.length)
                return this.expressionMap.insertColumns.indexOf(column.propertyPath) !== -1;
            // skip columns the user doesn't want included by default
            if (!column.isInsert) {
                return false;
            }
            // if user did not specified such list then return all columns except auto-increment one
            // for Oracle we return auto-increment column as well because Oracle does not support DEFAULT VALUES expression
            if (column.isGenerated && column.generationStrategy === "increment"
                && !(this.connection.driver instanceof OracleDriver_1.OracleDriver)
                && !(this.connection.driver instanceof AbstractSqliteDriver_1.AbstractSqliteDriver)
                && !(this.connection.driver instanceof MysqlDriver_1.MysqlDriver)
                && !(this.connection.driver instanceof AuroraDataApiDriver_1.AuroraDataApiDriver)
                && !(this.connection.driver instanceof SqlServerDriver_1.SqlServerDriver && this.isOverridingAutoIncrementBehavior(column)))
                return false;
            return true;
        });
    }
    /**
     * Creates a columns string where values must be inserted to for INSERT INTO expression.
     */
    createColumnNamesExpression() {
        const columns = this.getInsertedColumns();
        if (columns.length > 0)
            return columns.map(column => this.escape(column.databaseName)).join(", ");
        // in the case if there are no insert columns specified and table without metadata used
        // we get columns from the inserted value map, in the case if only one inserted map is specified
        if (!this.expressionMap.mainAlias.hasMetadata && !this.expressionMap.insertColumns.length) {
            const valueSets = this.getValueSets();
            if (valueSets.length === 1)
                return Object.keys(valueSets[0]).map(columnName => this.escape(columnName)).join(", ");
        }
        // get a table name and all column database names
        return this.expressionMap.insertColumns.map(columnName => this.escape(columnName)).join(", ");
    }
    /**
     * Creates list of values needs to be inserted in the VALUES expression.
     */
    createValuesExpression() {
        const valueSets = this.getValueSets();
        const columns = this.getInsertedColumns();
        // if column metadatas are given then apply all necessary operations with values
        if (columns.length > 0) {
            let expression = "";
            let parametersCount = Object.keys(this.expressionMap.nativeParameters).length;
            valueSets.forEach((valueSet, valueSetIndex) => {
                columns.forEach((column, columnIndex) => {
                    if (columnIndex === 0) {
                        if (this.connection.driver instanceof OracleDriver_1.OracleDriver && valueSets.length > 1) {
                            expression += " SELECT ";
                        }
                        else {
                            expression += "(";
                        }
                    }
                    const paramName = "i" + valueSetIndex + "_" + column.databaseName;
                    // extract real value from the entity
                    let value = column.getEntityValue(valueSet);
                    // if column is relational and value is an object then get real referenced column value from this object
                    // for example column value is { question: { id: 1 } }, value will be equal to { id: 1 }
                    // and we extract "1" from this object
                    /*if (column.referencedColumn && value instanceof Object && !(value instanceof Function)) { // todo: check if we still need it since getEntityValue already has similar code
                        value = column.referencedColumn.getEntityValue(value);
                    }*/
                    if (!(value instanceof Function)) {
                        // make sure our value is normalized by a driver
                        value = this.connection.driver.preparePersistentValue(value, column);
                    }
                    // newly inserted entities always have a version equal to 1 (first version)
                    // also, user-specified version must be empty
                    if (column.isVersion && value === undefined) {
                        expression += "1";
                        // } else if (column.isNestedSetLeft) {
                        //     const tableName = this.connection.driver.escape(column.entityMetadata.tablePath);
                        //     const rightColumnName = this.connection.driver.escape(column.entityMetadata.nestedSetRightColumn!.databaseName);
                        //     const subQuery = `(SELECT c.max + 1 FROM (SELECT MAX(${rightColumnName}) as max from ${tableName}) c)`;
                        //     expression += subQuery;
                        //
                        // } else if (column.isNestedSetRight) {
                        //     const tableName = this.connection.driver.escape(column.entityMetadata.tablePath);
                        //     const rightColumnName = this.connection.driver.escape(column.entityMetadata.nestedSetRightColumn!.databaseName);
                        //     const subQuery = `(SELECT c.max + 2 FROM (SELECT MAX(${rightColumnName}) as max from ${tableName}) c)`;
                        //     expression += subQuery;
                    }
                    else if (column.isDiscriminator) {
                        this.expressionMap.nativeParameters["discriminator_value_" + parametersCount] = this.expressionMap.mainAlias.metadata.discriminatorValue;
                        expression += this.connection.driver.createParameter("discriminator_value_" + parametersCount, parametersCount);
                        parametersCount++;
                        // return "1";
                        // for create and update dates we insert current date
                        // no, we don't do it because this constant is already in "default" value of the column
                        // with extended timestamp functionality, like CURRENT_TIMESTAMP(6) for example
                        // } else if (column.isCreateDate || column.isUpdateDate) {
                        //     return "CURRENT_TIMESTAMP";
                        // if column is generated uuid and database does not support its generation and custom generated value was not provided by a user - we generate a new uuid value for insertion
                    }
                    else if (column.isGenerated && column.generationStrategy === "uuid" && !this.connection.driver.isUUIDGenerationSupported() && value === undefined) {
                        const paramName = "uuid_" + column.databaseName + valueSetIndex;
                        value = RandomGenerator_1.RandomGenerator.uuid4();
                        this.expressionMap.nativeParameters[paramName] = value;
                        expression += this.connection.driver.createParameter(paramName, parametersCount);
                        parametersCount++;
                        // if value for this column was not provided then insert default value
                    }
                    else if (value === undefined) {
                        if ((this.connection.driver instanceof OracleDriver_1.OracleDriver && valueSets.length > 1) || this.connection.driver instanceof AbstractSqliteDriver_1.AbstractSqliteDriver || this.connection.driver instanceof SapDriver_1.SapDriver) { // unfortunately sqlite does not support DEFAULT expression in INSERT queries
                            if (column.default !== undefined && column.default !== null) { // try to use default defined in the column
                                expression += this.connection.driver.normalizeDefault(column);
                            }
                            else {
                                expression += "NULL"; // otherwise simply use NULL and pray if column is nullable
                            }
                        }
                        else {
                            expression += "DEFAULT";
                        }
                        // support for SQL expressions in queries
                    }
                    else if (value instanceof Function) {
                        expression += value();
                        // just any other regular value
                    }
                    else {
                        if (this.connection.driver instanceof SqlServerDriver_1.SqlServerDriver)
                            value = this.connection.driver.parametrizeValue(column, value);
                        // we need to store array values in a special class to make sure parameter replacement will work correctly
                        // if (value instanceof Array)
                        //     value = new ArrayParameter(value);
                        this.expressionMap.nativeParameters[paramName] = value;
                        if ((this.connection.driver instanceof MysqlDriver_1.MysqlDriver || this.connection.driver instanceof AuroraDataApiDriver_1.AuroraDataApiDriver) && this.connection.driver.spatialTypes.indexOf(column.type) !== -1) {
                            const useLegacy = this.connection.driver.options.legacySpatialSupport;
                            const geomFromText = useLegacy ? "GeomFromText" : "ST_GeomFromText";
                            if (column.srid != null) {
                                expression += `${geomFromText}(${this.connection.driver.createParameter(paramName, parametersCount)}, ${column.srid})`;
                            }
                            else {
                                expression += `${geomFromText}(${this.connection.driver.createParameter(paramName, parametersCount)})`;
                            }
                        }
                        else if (this.connection.driver instanceof PostgresDriver_1.PostgresDriver && this.connection.driver.spatialTypes.indexOf(column.type) !== -1) {
                            if (column.srid != null) {
                                expression += `ST_SetSRID(ST_GeomFromGeoJSON(${this.connection.driver.createParameter(paramName, parametersCount)}), ${column.srid})::${column.type}`;
                            }
                            else {
                                expression += `ST_GeomFromGeoJSON(${this.connection.driver.createParameter(paramName, parametersCount)})::${column.type}`;
                            }
                        }
                        else if (this.connection.driver instanceof SqlServerDriver_1.SqlServerDriver && this.connection.driver.spatialTypes.indexOf(column.type) !== -1) {
                            expression += column.type + "::STGeomFromText(" + this.connection.driver.createParameter(paramName, parametersCount) + ", " + (column.srid || "0") + ")";
                        }
                        else {
                            expression += this.connection.driver.createParameter(paramName, parametersCount);
                        }
                        parametersCount++;
                    }
                    if (columnIndex === columns.length - 1) {
                        if (valueSetIndex === valueSets.length - 1) {
                            if (this.connection.driver instanceof OracleDriver_1.OracleDriver && valueSets.length > 1) {
                                expression += " FROM DUAL ";
                            }
                            else {
                                expression += ")";
                            }
                        }
                        else {
                            if (this.connection.driver instanceof OracleDriver_1.OracleDriver && valueSets.length > 1) {
                                expression += " FROM DUAL UNION ALL ";
                            }
                            else {
                                expression += "), ";
                            }
                        }
                    }
                    else {
                        expression += ", ";
                    }
                });
            });
            if (expression === "()")
                return "";
            return expression;
        }
        else { // for tables without metadata
            // get values needs to be inserted
            let expression = "";
            let parametersCount = Object.keys(this.expressionMap.nativeParameters).length;
            valueSets.forEach((valueSet, insertionIndex) => {
                const columns = Object.keys(valueSet);
                columns.forEach((columnName, columnIndex) => {
                    if (columnIndex === 0) {
                        expression += "(";
                    }
                    const paramName = "i" + insertionIndex + "_" + columnName;
                    const value = valueSet[columnName];
                    // support for SQL expressions in queries
                    if (value instanceof Function) {
                        expression += value();
                        // if value for this column was not provided then insert default value
                    }
                    else if (value === undefined) {
                        if (this.connection.driver instanceof AbstractSqliteDriver_1.AbstractSqliteDriver || this.connection.driver instanceof SapDriver_1.SapDriver) {
                            expression += "NULL";
                        }
                        else {
                            expression += "DEFAULT";
                        }
                        // just any other regular value
                    }
                    else {
                        this.expressionMap.nativeParameters[paramName] = value;
                        expression += this.connection.driver.createParameter(paramName, parametersCount);
                        parametersCount++;
                    }
                    if (columnIndex === Object.keys(valueSet).length - 1) {
                        if (insertionIndex === valueSets.length - 1) {
                            expression += ")";
                        }
                        else {
                            expression += "), ";
                        }
                    }
                    else {
                        expression += ", ";
                    }
                });
            });
            if (expression === "()")
                return "";
            return expression;
        }
    }
    /**
     * Gets array of values need to be inserted into the target table.
     */
    getValueSets() {
        if (Array.isArray(this.expressionMap.valuesSet))
            return this.expressionMap.valuesSet;
        if (this.expressionMap.valuesSet instanceof Object)
            return [this.expressionMap.valuesSet];
        throw new InsertValuesMissingError_1.InsertValuesMissingError();
    }
    /**
     * Checks if column is an auto-generated primary key, but the current insertion specifies a value for it.
     *
     * @param column
     */
    isOverridingAutoIncrementBehavior(column) {
        return column.isPrimary
            && column.isGenerated
            && column.generationStrategy === "increment"
            && this.getValueSets().some((valueSet) => column.getEntityValue(valueSet) !== undefined
                && column.getEntityValue(valueSet) !== null);
    }
}
exports.InsertQueryBuilder = InsertQueryBuilder;

//# sourceMappingURL=InsertQueryBuilder.js.map
