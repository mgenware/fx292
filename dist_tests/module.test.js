"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const fs_1 = require("fs");
const assert = require("assert");
const statAsync = util_1.promisify(fs_1.stat);
it('Verify type definition files', async () => {
    assert.ok((await statAsync('./dist/main.d.ts')).isFile());
});
//# sourceMappingURL=module.test.js.map