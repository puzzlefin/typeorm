"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BetterSqlite3QueryRunner = void 0;
var tslib_1 = require("tslib");
var QueryRunnerAlreadyReleasedError_1 = require("../../error/QueryRunnerAlreadyReleasedError");
var QueryFailedError_1 = require("../../error/QueryFailedError");
var AbstractSqliteQueryRunner_1 = require("../sqlite-abstract/AbstractSqliteQueryRunner");
var Broadcaster_1 = require("../../subscriber/Broadcaster");
/**
 * Runs queries on a single sqlite database connection.
 *
 * Does not support compose primary keys with autoincrement field.
 * todo: need to throw exception for this case.
 */
var BetterSqlite3QueryRunner = /** @class */ (function (_super) {
    tslib_1.__extends(BetterSqlite3QueryRunner, _super);
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    function BetterSqlite3QueryRunner(driver) {
        var _this = _super.call(this) || this;
        _this.stmtCache = new Map();
        _this.driver = driver;
        _this.connection = driver.connection;
        _this.broadcaster = new Broadcaster_1.Broadcaster(_this);
        if (typeof _this.driver.options.statementCacheSize === "number") {
            _this.cacheSize = _this.driver.options.statementCacheSize;
        }
        else {
            _this.cacheSize = 100;
        }
        return _this;
    }
    BetterSqlite3QueryRunner.prototype.getStmt = function (query) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var stmt, databaseConnection, key, databaseConnection;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.cacheSize > 0)) return [3 /*break*/, 3];
                        stmt = this.stmtCache.get(query);
                        if (!!stmt) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.connect()];
                    case 1:
                        databaseConnection = _a.sent();
                        stmt = databaseConnection.prepare(query);
                        this.stmtCache.set(query, stmt);
                        while (this.stmtCache.size > this.cacheSize) {
                            key = this.stmtCache.keys().next().value;
                            this.stmtCache.delete(key);
                        }
                        _a.label = 2;
                    case 2: return [2 /*return*/, stmt];
                    case 3: return [4 /*yield*/, this.connect()];
                    case 4:
                        databaseConnection = _a.sent();
                        return [2 /*return*/, databaseConnection.prepare(query)];
                }
            });
        });
    };
    /**
     * Executes a given SQL query.
     */
    BetterSqlite3QueryRunner.prototype.query = function (query, parameters) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var connection, i, queryStartTime, stmt, result, maxQueryExecutionTime, queryEndTime, queryExecutionTime;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.isReleased)
                            throw new QueryRunnerAlreadyReleasedError_1.QueryRunnerAlreadyReleasedError();
                        connection = this.driver.connection;
                        parameters = parameters || [];
                        for (i = 0; i < parameters.length; i++) {
                            // in "where" clauses the parameters are not escaped by the driver
                            if (typeof parameters[i] === "boolean")
                                parameters[i] = +parameters[i];
                        }
                        this.driver.connection.logger.logQuery(query, parameters, this);
                        queryStartTime = +new Date();
                        return [4 /*yield*/, this.getStmt(query)];
                    case 1:
                        stmt = _a.sent();
                        try {
                            result = void 0;
                            if (stmt.reader) {
                                result = stmt.all.apply(stmt, parameters);
                            }
                            else {
                                result = stmt.run.apply(stmt, parameters);
                                if (query.substr(0, 6) === "INSERT") {
                                    result = result.lastInsertRowid;
                                }
                            }
                            maxQueryExecutionTime = connection.options.maxQueryExecutionTime;
                            queryEndTime = +new Date();
                            queryExecutionTime = queryEndTime - queryStartTime;
                            if (maxQueryExecutionTime && queryExecutionTime > maxQueryExecutionTime)
                                connection.logger.logQuerySlow(queryExecutionTime, query, parameters, this);
                            return [2 /*return*/, result];
                        }
                        catch (err) {
                            connection.logger.logQueryError(err, query, parameters, this);
                            throw new QueryFailedError_1.QueryFailedError(query, parameters, err);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    return BetterSqlite3QueryRunner;
}(AbstractSqliteQueryRunner_1.AbstractSqliteQueryRunner));
exports.BetterSqlite3QueryRunner = BetterSqlite3QueryRunner;

//# sourceMappingURL=BetterSqlite3QueryRunner.js.map
