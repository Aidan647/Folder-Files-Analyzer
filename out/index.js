"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("fs/promises");
const path_1 = require("path");
const mime_1 = require("mime");
const console_table_printer_1 = require("console-table-printer");
async function* getFiles(dir) {
    const dirents = await promises_1.readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
        const res = path_1.resolve(dir, dirent.name);
        if (dirent.isDirectory()) {
            yield* getFiles(res);
        }
        else {
            yield [res, dirent.name];
        }
    }
}
class type {
    mime;
    extension;
    count;
    percent;
    constructor(ext) {
        this.mime = mime_1.getType(ext) ?? "";
        this.extension = ext;
        this.count = 1;
        this.percent = "0.00%";
    }
    add() {
        this.count++;
    }
    get(total) {
        this.percent = ((this.count / total) * 100).toFixed(2) + "%";
        return this;
    }
}
;
(async () => {
    const total = {};
    var count = 0;
    for await (const f of getFiles("C:/Users/Kirill/Desktop/code")) {
        // console.log(getType(f[0]))
        const ext = path_1.extname(f[0]) || f[1];
        if (total[ext])
            total[ext].add();
        else
            total[ext] = new type(ext);
        count++;
    }
    const t = new console_table_printer_1.Table({
        sort: (row1, row2) => {
            if (row1.extension == "other")
                return Infinity;
            return row2.count - row1.count;
        },
    });
    const values = Object.values(total).sort((x, y) => {
        return y.count - x.count;
    });
    if (values.length > 50) {
        values.slice(0, 49).forEach((data) => {
            t.addRow(data.get(count));
        });
        const files = values.slice(50).reduce((x, y) => {
            x += y.count;
            return x;
        }, 0);
        console.log(files);
        t.addRow({
            extension: "other",
            count: files,
            percent: ((files / count) * 100).toFixed(2) + "%",
        }, { color: "cyan" });
    }
    else
        values.forEach((data) => {
            t.addRow(data.get(count));
        });
    t.printTable();
    // console.table(total, ["extension", "count"])
})();
