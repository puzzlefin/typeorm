"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractSqliteDriver = void 0;
const tslib_1 = require("tslib");
const DateUtils_1 = require("../../util/DateUtils");
const RdbmsSchemaBuilder_1 = require("../../schema-builder/RdbmsSchemaBuilder");
const OrmUtils_1 = require("../../util/OrmUtils");
const ApplyValueTransformers_1 = require("../../util/ApplyValueTransformers");
/**
 * Organizes communication with sqlite DBMS.
 */
class AbstractSqliteDriver {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(connection) {
        /**
         * Indicates if replication is enabled.
         */
        this.isReplicated = false;
        /**
         * Indicates if tree tables are supported by this driver.
         */
        this.treeSupport = true;
        /**
         * Gets list of supported column data types by a driver.
         *
         * @see https://www.tutorialspoint.com/sqlite/sqlite_data_types.htm
         * @see https://sqlite.org/datatype3.html
         */
        this.supportedDataTypes = [
            "int",
            "integer",
            "tinyint",
            "smallint",
            "mediumint",
            "bigint",
            "unsigned big int",
            "int2",
            "int8",
            "integer",
            "character",
            "varchar",
            "varying character",
            "nchar",
            "native character",
            "nvarchar",
            "text",
            "clob",
            "text",
            "blob",
            "real",
            "double",
            "double precision",
            "float",
            "real",
            "numeric",
            "decimal",
            "boolean",
            "date",
            "time",
            "datetime"
        ];
        /**
         * Gets list of column data types that support length by a driver.
         */
        this.withLengthColumnTypes = [
            "character",
            "varchar",
            "varying character",
            "nchar",
            "native character",
            "nvarchar",
            "text",
            "blob",
            "clob"
        ];
        /**
         * Gets list of spatial column data types.
         */
        this.spatialTypes = [];
        /**
         * Gets list of column data types that support precision by a driver.
         */
        this.withPrecisionColumnTypes = [
            "real",
            "double",
            "double precision",
            "float",
            "real",
            "numeric",
            "decimal",
            "date",
            "time",
            "datetime"
        ];
        /**
         * Gets list of column data types that support scale by a driver.
         */
        this.withScaleColumnTypes = [
            "real",
            "double",
            "double precision",
            "float",
            "real",
            "numeric",
            "decimal",
        ];
        /**
         * Orm has special columns and we need to know what database column types should be for those types.
         * Column types are driver dependant.
         */
        this.mappedDataTypes = {
            createDate: "datetime",
            createDateDefault: "datetime('now')",
            updateDate: "datetime",
            updateDateDefault: "datetime('now')",
            deleteDate: "datetime",
            deleteDateNullable: true,
            version: "integer",
            treeLevel: "integer",
            migrationId: "integer",
            migrationName: "varchar",
            migrationTimestamp: "bigint",
            cacheId: "int",
            cacheIdentifier: "varchar",
            cacheTime: "bigint",
            cacheDuration: "int",
            cacheQuery: "text",
            cacheResult: "text",
            metadataType: "varchar",
            metadataDatabase: "varchar",
            metadataSchema: "varchar",
            metadataTable: "varchar",
            metadataName: "varchar",
            metadataValue: "text",
        };
        this.connection = connection;
        this.options = connection.options;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Performs connection to the database.
     */
    connect() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this.databaseConnection = yield this.createDatabaseConnection();
        });
    }
    /**
     * Makes any action after connection (e.g. create extensions in Postgres driver).
     */
    afterConnect() {
        return Promise.resolve();
    }
    /**
     * Closes connection with database.
     */
    disconnect() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return new Promise((ok, fail) => {
                this.queryRunner = undefined;
                this.databaseConnection.close((err) => err ? fail(err) : ok());
            });
        });
    }
    /**
     * Creates a schema builder used to build and sync a schema.
     */
    createSchemaBuilder() {
        return new RdbmsSchemaBuilder_1.RdbmsSchemaBuilder(this.connection);
    }
    /**
     * Prepares given value to a value to be persisted, based on its column type and metadata.
     */
    preparePersistentValue(value, columnMetadata) {
        if (columnMetadata.transformer)
            value = ApplyValueTransformers_1.ApplyValueTransformers.transformTo(columnMetadata.transformer, value);
        if (value === null || value === undefined)
            return value;
        if (columnMetadata.type === Boolean || columnMetadata.type === "boolean") {
            return value === true ? 1 : 0;
        }
        else if (columnMetadata.type === "date") {
            return DateUtils_1.DateUtils.mixedDateToDateString(value);
        }
        else if (columnMetadata.type === "time") {
            return DateUtils_1.DateUtils.mixedDateToTimeString(value);
        }
        else if (columnMetadata.type === "datetime" || columnMetadata.type === Date) {
            // to string conversation needs because SQLite stores date as integer number, when date came as Object
            // TODO: think about `toUTC` conversion
            return DateUtils_1.DateUtils.mixedDateToUtcDatetimeString(value);
        }
        else if (columnMetadata.type === "simple-array") {
            return DateUtils_1.DateUtils.simpleArrayToString(value);
        }
        else if (columnMetadata.type === "simple-json") {
            return DateUtils_1.DateUtils.simpleJsonToString(value);
        }
        else if (columnMetadata.type === "simple-enum") {
            return DateUtils_1.DateUtils.simpleEnumToString(value);
        }
        return value;
    }
    /**
     * Prepares given value to a value to be hydrated, based on its column type or metadata.
     */
    prepareHydratedValue(value, columnMetadata) {
        if (value === null || value === undefined)
            return columnMetadata.transformer ? ApplyValueTransformers_1.ApplyValueTransformers.transformFrom(columnMetadata.transformer, value) : value;
        if (columnMetadata.type === Boolean || columnMetadata.type === "boolean") {
            value = value ? true : false;
        }
        else if (columnMetadata.type === "datetime" || columnMetadata.type === Date) {
            /**
             * Fix date conversion issue
             *
             * If the format of the date string is "2018-03-14 02:33:33.906", Safari (and iOS WKWebView) will convert it to an invalid date object.
             * We need to modify the date string to "2018-03-14T02:33:33.906Z" and Safari will convert it correctly.
             *
             * ISO 8601
             * https://www.w3.org/TR/NOTE-datetime
             */
            if (value && typeof value === "string") {
                // There are various valid time string formats a sqlite time string might have:
                // https://www.sqlite.org/lang_datefunc.html
                // There are two separate fixes we may need to do:
                //   1) Add 'T' separator if space is used instead
                //   2) Add 'Z' UTC suffix if no timezone or offset specified
                if (/^\d\d\d\d-\d\d-\d\d \d\d:\d\d/.test(value)) {
                    value = value.replace(" ", "T");
                }
                if (/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d\d\d)?)?$/.test(value)) {
                    value += "Z";
                }
            }
            value = DateUtils_1.DateUtils.normalizeHydratedDate(value);
        }
        else if (columnMetadata.type === "date") {
            value = DateUtils_1.DateUtils.mixedDateToDateString(value);
        }
        else if (columnMetadata.type === "time") {
            value = DateUtils_1.DateUtils.mixedTimeToString(value);
        }
        else if (columnMetadata.type === "simple-array") {
            value = DateUtils_1.DateUtils.stringToSimpleArray(value);
        }
        else if (columnMetadata.type === "simple-json") {
            value = DateUtils_1.DateUtils.stringToSimpleJson(value);
        }
        else if (columnMetadata.type === "simple-enum") {
            value = DateUtils_1.DateUtils.stringToSimpleEnum(value, columnMetadata);
        }
        if (columnMetadata.transformer)
            value = ApplyValueTransformers_1.ApplyValueTransformers.transformFrom(columnMetadata.transformer, value);
        return value;
    }
    /**
     * Replaces parameters in the given sql with special escaping character
     * and an array of parameter names to be passed to a query.
     */
    escapeQueryWithParameters(sql, parameters, nativeParameters) {
        const builtParameters = Object.keys(nativeParameters).map(key => {
            // Mapping boolean values to their numeric representation
            if (typeof nativeParameters[key] === "boolean") {
                return nativeParameters[key] === true ? 1 : 0;
            }
            return nativeParameters[key];
        });
        if (!parameters || !Object.keys(parameters).length)
            return [sql, builtParameters];
        const keys = Object.keys(parameters).map(parameter => "(:(\\.\\.\\.)?" + parameter + "\\b)").join("|");
        sql = sql.replace(new RegExp(keys, "g"), (key) => {
            let value;
            let isArray = false;
            if (key.substr(0, 4) === ":...") {
                isArray = true;
                value = parameters[key.substr(4)];
            }
            else {
                value = parameters[key.substr(1)];
            }
            if (isArray) {
                return value.map((v) => {
                    builtParameters.push(v);
                    return "?";
                    // return "$" + builtParameters.length;
                }).join(", ");
            }
            else if (value instanceof Function) {
                return value();
            }
            else {
                builtParameters.push(value);
                return "?";
                // return "$" + builtParameters.length;
            }
        }); // todo: make replace only in value statements, otherwise problems
        return [sql, builtParameters];
    }
    /**
     * Escapes a column name.
     */
    escape(columnName) {
        return "\"" + columnName + "\"";
    }
    /**
     * Build full table name with database name, schema name and table name.
     * E.g. "myDB"."mySchema"."myTable"
     *
     * Returns only simple table name because all inherited drivers does not supports schema and database.
     */
    buildTableName(tableName, schema, database) {
        return tableName;
    }
    /**
     * Creates a database type from a given column metadata.
     */
    normalizeType(column) {
        if (column.type === Number || column.type === "int") {
            return "integer";
        }
        else if (column.type === String) {
            return "varchar";
        }
        else if (column.type === Date) {
            return "datetime";
        }
        else if (column.type === Boolean) {
            return "boolean";
        }
        else if (column.type === "uuid") {
            return "varchar";
        }
        else if (column.type === "simple-array") {
            return "text";
        }
        else if (column.type === "simple-json") {
            return "text";
        }
        else if (column.type === "simple-enum") {
            return "varchar";
        }
        else {
            return column.type || "";
        }
    }
    /**
     * Normalizes "default" value of the column.
     */
    normalizeDefault(columnMetadata) {
        const defaultValue = columnMetadata.default;
        if (typeof defaultValue === "number") {
            return "" + defaultValue;
        }
        else if (typeof defaultValue === "boolean") {
            return defaultValue === true ? "1" : "0";
        }
        else if (typeof defaultValue === "function") {
            return defaultValue();
        }
        else if (typeof defaultValue === "string") {
            return `'${defaultValue}'`;
        }
        else if (defaultValue === null) {
            return undefined;
        }
        else {
            return defaultValue;
        }
    }
    /**
     * Normalizes "isUnique" value of the column.
     */
    normalizeIsUnique(column) {
        return column.entityMetadata.uniques.some(uq => uq.columns.length === 1 && uq.columns[0] === column);
    }
    /**
     * Calculates column length taking into account the default length values.
     */
    getColumnLength(column) {
        return column.length ? column.length.toString() : "";
    }
    /**
     * Normalizes "default" value of the column.
     */
    createFullType(column) {
        let type = column.type;
        if (column.enum) {
            return "varchar";
        }
        if (column.length) {
            type += "(" + column.length + ")";
        }
        else if (column.precision !== null && column.precision !== undefined && column.scale !== null && column.scale !== undefined) {
            type += "(" + column.precision + "," + column.scale + ")";
        }
        else if (column.precision !== null && column.precision !== undefined) {
            type += "(" + column.precision + ")";
        }
        if (column.isArray)
            type += " array";
        return type;
    }
    /**
     * Obtains a new database connection to a master server.
     * Used for replication.
     * If replication is not setup then returns default connection's database connection.
     */
    obtainMasterConnection() {
        return Promise.resolve();
    }
    /**
     * Obtains a new database connection to a slave server.
     * Used for replication.
     * If replication is not setup then returns master (default) connection's database connection.
     */
    obtainSlaveConnection() {
        return Promise.resolve();
    }
    /**
     * Creates generated map of values generated or returned by database after INSERT query.
     */
    createGeneratedMap(metadata, insertResult, entityIndex, entityNum) {
        const generatedMap = metadata.generatedColumns.reduce((map, generatedColumn) => {
            let value;
            if (generatedColumn.generationStrategy === "increment" && insertResult) {
                // NOTE: When INSERT statement is successfully completed, the last inserted row ID is returned.
                // see also: SqliteQueryRunner.query()
                value = insertResult - entityNum + entityIndex + 1;
                // } else if (generatedColumn.generationStrategy === "uuid") {
                //     value = insertValue[generatedColumn.databaseName];
            }
            if (!value)
                return map;
            return OrmUtils_1.OrmUtils.mergeDeep(map, generatedColumn.createValueMap(value));
        }, {});
        return Object.keys(generatedMap).length > 0 ? generatedMap : undefined;
    }
    /**
     * Differentiate columns of this table and columns from the given column metadatas columns
     * and returns only changed.
     */
    findChangedColumns(tableColumns, columnMetadatas) {
        return columnMetadatas.filter(columnMetadata => {
            const tableColumn = tableColumns.find(c => c.name === columnMetadata.databaseName);
            if (!tableColumn)
                return false; // we don't need new columns, we only need exist and changed
            // console.log("table:", columnMetadata.entityMetadata.tableName);
            // console.log("name:", tableColumn.name, columnMetadata.databaseName);
            // console.log("type:", tableColumn.type, this.normalizeType(columnMetadata));
            // console.log("length:", tableColumn.length, columnMetadata.length);
            // console.log("precision:", tableColumn.precision, columnMetadata.precision);
            // console.log("scale:", tableColumn.scale, columnMetadata.scale);
            // console.log("comment:", tableColumn.comment, columnMetadata.comment);
            // console.log("default:", this.normalizeDefault(columnMetadata), columnMetadata.default);
            // console.log("isPrimary:", tableColumn.isPrimary, columnMetadata.isPrimary);
            // console.log("isNullable:", tableColumn.isNullable, columnMetadata.isNullable);
            // console.log("isUnique:", tableColumn.isUnique, this.normalizeIsUnique(columnMetadata));
            // console.log("isGenerated:", tableColumn.isGenerated, columnMetadata.isGenerated);
            // console.log("==========================================");
            return tableColumn.name !== columnMetadata.databaseName
                || tableColumn.type !== this.normalizeType(columnMetadata)
                || tableColumn.length !== columnMetadata.length
                || tableColumn.precision !== columnMetadata.precision
                || tableColumn.scale !== columnMetadata.scale
                //  || tableColumn.comment !== columnMetadata.comment || // todo
                || this.normalizeDefault(columnMetadata) !== tableColumn.default
                || tableColumn.isPrimary !== columnMetadata.isPrimary
                || tableColumn.isNullable !== columnMetadata.isNullable
                || tableColumn.isUnique !== this.normalizeIsUnique(columnMetadata)
                || (columnMetadata.generationStrategy !== "uuid" && tableColumn.isGenerated !== columnMetadata.isGenerated);
        });
    }
    /**
     * Returns true if driver supports RETURNING / OUTPUT statement.
     */
    isReturningSqlSupported() {
        return false;
    }
    /**
     * Returns true if driver supports uuid values generation on its own.
     */
    isUUIDGenerationSupported() {
        return false;
    }
    /**
     * Returns true if driver supports fulltext indices.
     */
    isFullTextColumnTypeSupported() {
        return false;
    }
    /**
     * Creates an escaped parameter.
     */
    createParameter(parameterName, index) {
        // return "$" + (index + 1);
        return "?";
        // return "$" + parameterName;
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Creates connection with the database.
     */
    createDatabaseConnection() {
        throw new Error("Do not use AbstractSqlite directly, it has to be used with one of the sqlite drivers");
    }
    /**
     * If driver dependency is not given explicitly, then try to load it via "require".
     */
    loadDependencies() {
        // dependencies have to be loaded in the specific driver
    }
}
exports.AbstractSqliteDriver = AbstractSqliteDriver;
//# sourceMappingURL=AbstractSqliteDriver.js.map