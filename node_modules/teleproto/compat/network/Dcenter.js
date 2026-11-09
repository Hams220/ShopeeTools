"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DcenterRegistry = exports.Dcenter = void 0;
var DcState_1 = require("../../network/dc/DcState");
Object.defineProperty(exports, "Dcenter", { enumerable: true, get: function () { return DcState_1.DcState; } });
Object.defineProperty(exports, "DcenterRegistry", { enumerable: true, get: function () { return DcState_1.DcStateRegistry; } });
