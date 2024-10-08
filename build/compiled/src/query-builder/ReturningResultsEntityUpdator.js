"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReturningResultsEntityUpdator = void 0;
const tslib_1 = require("tslib");
const OrmUtils_1 = require("../util/OrmUtils");
const OracleDriver_1 = require("../driver/oracle/OracleDriver");
/**
 * Updates entity with returning results in the entity insert and update operations.
 */
class ReturningResultsEntityUpdator {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(queryRunner, expressionMap) {
        this.queryRunner = queryRunner;
        this.expressionMap = expressionMap;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Updates entities with a special columns after updation query execution.
     */
    update(updateResult, entities) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const metadata = this.expressionMap.mainAlias.metadata;
            yield Promise.all(entities.map((entity, entityIndex) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                // if database supports returning/output statement then we already should have updating values in the raw data returned by insert query
                if (this.queryRunner.connection.driver.isReturningSqlSupported()) {
                    if (this.queryRunner.connection.driver instanceof OracleDriver_1.OracleDriver && Array.isArray(updateResult.raw) && this.expressionMap.extraReturningColumns.length > 0) {
                        updateResult.raw = updateResult.raw.reduce((newRaw, rawItem, rawItemIndex) => {
                            newRaw[this.expressionMap.extraReturningColumns[rawItemIndex].databaseName] = rawItem[0];
                            return newRaw;
                        }, {});
                    }
                    const result = Array.isArray(updateResult.raw) ? updateResult.raw[entityIndex] : updateResult.raw;
                    const returningColumns = this.queryRunner.connection.driver.createGeneratedMap(metadata, result);
                    if (returningColumns) {
                        this.queryRunner.manager.merge(metadata.target, entity, returningColumns);
                        updateResult.generatedMaps.push(returningColumns);
                    }
                }
                else {
                    // for driver which do not support returning/output statement we need to perform separate query and load what we need
                    const updationColumns = this.getUpdationReturningColumns();
                    if (updationColumns.length > 0) {
                        // get entity id by which we will get needed data
                        const entityId = this.expressionMap.mainAlias.metadata.getEntityIdMap(entity);
                        if (!entityId)
                            throw new Error(`Cannot update entity because entity id is not set in the entity.`);
                        // execute query to get needed data
                        const loadedReturningColumns = yield this.queryRunner.manager
                            .createQueryBuilder()
                            .select(metadata.primaryColumns.map(column => metadata.targetName + "." + column.propertyPath))
                            .addSelect(this.getUpdationReturningColumns().map(column => metadata.targetName + "." + column.propertyPath))
                            .from(metadata.target, metadata.targetName)
                            .where(entityId)
                            .setOption("create-pojo") // use POJO because created object can contain default values, e.g. property = null and those properties maight be overridden by merge process
                            .getOne();
                        if (loadedReturningColumns) {
                            this.queryRunner.manager.merge(metadata.target, entity, loadedReturningColumns);
                            updateResult.generatedMaps.push(loadedReturningColumns);
                        }
                    }
                }
            })));
        });
    }
    /**
     * Updates entities with a special columns after insertion query execution.
     */
    insert(insertResult, entities) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const metadata = this.expressionMap.mainAlias.metadata;
            const insertionColumns = this.getInsertionReturningColumns();
            const generatedMaps = entities.map((entity, entityIndex) => {
                if (this.queryRunner.connection.driver instanceof OracleDriver_1.OracleDriver && Array.isArray(insertResult.raw) && this.expressionMap.extraReturningColumns.length > 0) {
                    insertResult.raw = insertResult.raw.reduce((newRaw, rawItem, rawItemIndex) => {
                        newRaw[this.expressionMap.extraReturningColumns[rawItemIndex].databaseName] = rawItem[0];
                        return newRaw;
                    }, {});
                }
                // get all values generated by a database for us
                const result = Array.isArray(insertResult.raw) ? insertResult.raw[entityIndex] : insertResult.raw;
                const generatedMap = this.queryRunner.connection.driver.createGeneratedMap(metadata, result, entityIndex, entities.length) || {};
                // if database does not support uuid generation we need to get uuid values
                // generated by orm and set them to the generatedMap
                if (this.queryRunner.connection.driver.isUUIDGenerationSupported() === false) {
                    metadata.generatedColumns.forEach(generatedColumn => {
                        if (generatedColumn.generationStrategy === "uuid") {
                            // uuid can be defined by user in a model, that's why first we get it
                            let uuid = generatedColumn.getEntityValue(entity);
                            if (!uuid) // if it was not defined by a user then InsertQueryBuilder generates it by its own, get this generated uuid value
                                uuid = this.expressionMap.nativeParameters["uuid_" + generatedColumn.databaseName + entityIndex];
                            OrmUtils_1.OrmUtils.mergeDeep(generatedMap, generatedColumn.createValueMap(uuid));
                        }
                    });
                }
                this.queryRunner.manager.merge(metadata.target, entity, generatedMap); // todo: this should not be here, but problem with below line
                return generatedMap;
            });
            // for postgres and mssql we use returning/output statement to get values of inserted default and generated values
            // for other drivers we have to re-select this data from the database
            if (this.queryRunner.connection.driver.isReturningSqlSupported() === false && insertionColumns.length > 0) {
                const entityIds = entities.map((entity) => {
                    const entityId = metadata.getEntityIdMap(entity);
                    // We have to check for an empty `entityId` - if we don't, the query against the database
                    // effectively drops the `where` clause entirely and the first record will be returned -
                    // not what we want at all.
                    if (!entityId)
                        throw new Error(`Cannot update entity because entity id is not set in the entity.`);
                    return entityId;
                });
                // to select just inserted entities we need a criteria to select by.
                // for newly inserted entities in drivers which do not support returning statement
                // row identifier can only be an increment column
                // (since its the only thing that can be generated by those databases)
                // or (and) other primary key which is defined by a user and inserted value has it
                const returningResult = yield this.queryRunner.manager
                    .createQueryBuilder()
                    .select(metadata.primaryColumns.map(column => metadata.targetName + "." + column.propertyPath))
                    .addSelect(insertionColumns.map(column => metadata.targetName + "." + column.propertyPath))
                    .from(metadata.target, metadata.targetName)
                    .where(entityIds)
                    .setOption("create-pojo") // use POJO because created object can contain default values, e.g. property = null and those properties maight be overridden by merge process
                    .getMany();
                entities.forEach((entity, entityIndex) => {
                    this.queryRunner.manager.merge(metadata.target, generatedMaps[entityIndex], returningResult[entityIndex]);
                });
            }
            entities.forEach((entity, entityIndex) => {
                const entityId = metadata.getEntityIdMap(entity);
                insertResult.identifiers.push(entityId);
                insertResult.generatedMaps.push(generatedMaps[entityIndex]);
                this.queryRunner.manager.merge(this.expressionMap.mainAlias.metadata.target, entity, generatedMaps[entityIndex], generatedMaps[entityIndex]); // todo: why twice?!
            });
        });
    }
    /**
     * Columns we need to be returned from the database when we insert entity.
     */
    getInsertionReturningColumns() {
        // for databases which support returning statement we need to return extra columns like id
        // for other databases we don't need to return id column since its returned by a driver already
        const needToCheckGenerated = this.queryRunner.connection.driver.isReturningSqlSupported();
        // filter out the columns of which we need database inserted values to update our entity
        return this.expressionMap.mainAlias.metadata.columns.filter(column => {
            return column.default !== undefined ||
                (needToCheckGenerated && column.isGenerated) ||
                column.isCreateDate ||
                column.isUpdateDate ||
                column.isDeleteDate ||
                column.isVersion;
        });
    }
    /**
     * Columns we need to be returned from the database when we update entity.
     */
    getUpdationReturningColumns() {
        return this.expressionMap.mainAlias.metadata.columns.filter(column => {
            return column.isUpdateDate || column.isVersion;
        });
    }
}
exports.ReturningResultsEntityUpdator = ReturningResultsEntityUpdator;
//# sourceMappingURL=ReturningResultsEntityUpdator.js.map