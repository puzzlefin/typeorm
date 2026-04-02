"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tree = Tree;
const __1 = require("../../");
/**
 * Marks entity to work like a tree.
 * Tree pattern that will be used for the tree entity should be specified.
 * @TreeParent decorator must be used in tree entities.
 * TreeRepository can be used to manipulate with tree entities.
 */
function Tree(type, options) {
    return function (target) {
        (0, __1.getMetadataArgsStorage)().trees.push({
            target: target,
            type: type,
            options: type === "closure-table" ? options : undefined
        });
    };
}
//# sourceMappingURL=Tree.js.map